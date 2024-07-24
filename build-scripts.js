const fs = require('fs');
const path = require('path');

// Parse command-line arguments
const args = parseArgs(process.argv.slice(2));
const outputDir = args.outputDir || 'wwwroot';
const outputFile = args.outputFile || 'site.min.js';
const excludeDirs = args.excludeDirs ? args.excludeDirs.split(',') : ['wwwroot'];
const excludeFiles = args.excludeFiles ? args.excludeFiles.split(',') : [];
if (!excludeDirs.includes('node_modules'))  
    excludeDirs.push('node_modules');
   
if (!excludeDirs.includes('bin'))  
    excludeDirs.push('bin');
  
if (!excludeDirs.includes('obj'))  
    excludeDirs.push('obj');
  
const extension = args.extension || '.js';

(async () => {
    try {
        // Ensure the output directories exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const projectRoot = process.cwd();
        const outputFilePath = path.join(outputDir, outputFile); 

        // Concatenate JS files
        await concatenateJSFiles(projectRoot, outputFilePath, excludeDirs, excludeFiles);
    } catch (error) {
        console.error('Error during build:', error);
    }
})();

async function concatenateJSFiles(dir, outputFile, excludeDirs , excludeFiles) {
    try {
        const jsFiles = await searchFiles(dir, excludeDirs, excludeFiles, extension);
        let concatenatedContent = '';
        let generatedLine = 1;
        let generatedColumn = 0;

        // Initialize SourceMapGenerator
        const generator = new SourceMapGenerator(outputFile);

        for (const file of jsFiles) {
            console.log(`Reading ${file}`);

            const filePath = path.join(dir, file);
            const fileContent =  removeBOM(await fs.promises.readFile(filePath, 'utf-8'));

            // Add detailed mappings for the file
            const { lastGeneratedLine, lastGeneratedColumn } = generator.addMappingsForFile(
                fileContent,
                file,
                generatedLine,
                generatedColumn
            );

            // Update concatenated content
            concatenatedContent += fileContent;
            if (!fileContent.endsWith('\n')) {
                concatenatedContent += '\n';
            }

            // Update generated position
            generatedLine = lastGeneratedLine;
            generatedColumn = lastGeneratedColumn;

            // Set the source content
            generator.setSourceContent(file, fileContent);
        }

        // Write concatenated content
        await fs.promises.writeFile(outputFile, concatenatedContent, 'utf-8');
        console.log(`Successfully concatenated JS files into ${outputFile}`);

        // Generate and write source map
        const sourceMapPath = `${outputFile}.map`;
        generator.writeMap(sourceMapPath);
        console.log(`Source map generated at ${sourceMapPath}`);

    } catch (error) {
        console.error('Error concatenating JS files:', error);
    }
}



async function searchFiles(dir, excludeDirs, excludeFiles, extension) {
    const results = [];

    const traverse = async (currentDir) => {
        const files = await fs.promises.readdir(currentDir, { withFileTypes: true });
        for (const file of files) {
            const filePath = path.join(currentDir, file.name);
            const relativePath = path.relative(dir, filePath);

            if (excludeDirs.some(excludeDir => relativePath.startsWith(excludeDir)))
                continue;

            if( excludeFiles.some(excludeFile => matchRuleShort(file.name, excludeFile)))
                continue;    
 
            if (file.isDirectory()) {
                await traverse(filePath);
            } else if (file.isFile() && file.name.endsWith(extension)) {
                results.push(relativePath);
            }
        }
    };

    await traverse(dir);
    return results;
}

 

class SourceMapGenerator {
    constructor(generatedFilePath, sourceRoot = '') {
        this.generatedFilePath = path.resolve(generatedFilePath);
        this.sourceRoot = sourceRoot;
        this.sources = [];
        this.names = [];
        this.mappings = [];
        this.lineCount = 1;
        this.columnCount = 0;
        this.baseDir = path.dirname(this.generatedFilePath);
    }

    addSource(sourcePath) {
        const absoluteSourcePath = path.resolve(this.baseDir, sourcePath);
        const relativeSourcePath = path.relative(this.baseDir, absoluteSourcePath);
        const normalizedPath = relativeSourcePath.split(path.sep).join('/');
        if (!this.sources.includes(normalizedPath)) {
            this.sources.push(normalizedPath);
        }
        return this.sources.indexOf(normalizedPath);
    }

    addMapping(generatedLine, generatedColumn, originalSource, originalLine, originalColumn, name) {
        if (name && !this.names.includes(name)) {
            this.names.push(name);
        }

        const sourceIndex = this.addSource(originalSource);

        this.mappings.push({
            generatedLine,
            generatedColumn,
            originalSource: sourceIndex,
            originalLine,
            originalColumn,
            name: name ? this.names.indexOf(name) : undefined
        });
    }
    addMappingsForFile(fileContent, filePath, generatedLine, generatedColumn) {
        const lines = removeBOM(fileContent).split('\n');
        let currentGeneratedLine = generatedLine;
        let currentGeneratedColumn = generatedColumn;

        lines.forEach((line, lineIndex) => {
            let currentOriginalColumn = 0;

            // Process each character in the line
            for (let i = 0; i < line.length; i++) {
                this.addMapping(
                    currentGeneratedLine,
                    currentGeneratedColumn,
                    filePath,
                    lineIndex + 1,
                    currentOriginalColumn
                );

                currentGeneratedColumn++;
                currentOriginalColumn++;
            }

            // Add mapping for newline character
            this.addMapping(
                currentGeneratedLine,
                currentGeneratedColumn,
                filePath,
                lineIndex + 1,
                currentOriginalColumn
            );

            currentGeneratedLine++;
            currentGeneratedColumn = 0;
        });

        return { 
            lastGeneratedLine: currentGeneratedLine, 
            lastGeneratedColumn: currentGeneratedColumn 
        };
    }
    setSourceContent(sourcePath, sourceContent) {
        sourceContent = removeBOM(sourceContent);
        const index = this.addSource(sourcePath);
        if (index !== -1) {
            if (!this.sourcesContent) {
                this.sourcesContent = new Array(this.sources.length).fill(null);
            }
            this.sourcesContent[index] = sourceContent;
        }
    }

    _encodeVLQ(value) {
        const VLQ_BASE64_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        value = value < 0 ? (-value << 1) | 1 : value << 1;
        let encoded = '';
        do {
            let digit = value & 31;
            value >>= 5;
            if (value > 0) {
                digit |= 32;
            }
            encoded += VLQ_BASE64_DIGITS[digit];
        } while (value > 0);
        return encoded;
    }

    _generateMappings() {
        let prevGeneratedLine = 1;
        let prevGeneratedColumn = 0;
        let prevOriginalSource = 0;
        let prevOriginalLine = 1;
        let prevOriginalColumn = 0;
        let prevName = 0;

        return this.mappings
            .sort((a, b) => a.generatedLine - b.generatedLine || a.generatedColumn - b.generatedColumn)
            .map(mapping => {
                const result = [];

                if (mapping.generatedLine !== prevGeneratedLine) {
                    prevGeneratedColumn = 0;
                    while (prevGeneratedLine < mapping.generatedLine) {
                        result.push(';');
                        prevGeneratedLine++;
                    }
                }

                result.push(this._encodeVLQ(mapping.generatedColumn - prevGeneratedColumn));
                prevGeneratedColumn = mapping.generatedColumn;

                if (mapping.originalSource !== undefined) {
                    result.push(
                        this._encodeVLQ(mapping.originalSource - prevOriginalSource),
                        this._encodeVLQ(mapping.originalLine - prevOriginalLine),
                        this._encodeVLQ(mapping.originalColumn - prevOriginalColumn)
                    );
                    prevOriginalSource = mapping.originalSource;
                    prevOriginalLine = mapping.originalLine;
                    prevOriginalColumn = mapping.originalColumn;
                }

                if (mapping.name !== undefined) {
                    result.push(this._encodeVLQ(mapping.name - prevName));
                    prevName = mapping.name;
                }

                return result.join('');
            })
            .join(',');
    }

    generate() {
        const map = {
            version: 3,
            file: path.basename(this.generatedFilePath),
            sourceRoot: this.sourceRoot,
            sources: this.sources,
            names: this.names,
            mappings: this._generateMappings()
        };

        if (this.sourcesContent) {
            map.sourcesContent = this.sourcesContent;
        }

        return JSON.stringify(map);
    }

    writeMap(outputPath) {
        const mapContent = this.generate();
        fs.writeFileSync(outputPath, mapContent);
        // Add sourceMappingURL to the generated file
        const sourceMapUrl = path.basename(outputPath);
        const generatedContent = fs.readFileSync(this.generatedFilePath, 'utf8');
        let updatedContent=''
        if (sourceMapUrl.includes('css.map')){
            updatedContent = generatedContent + `\n/*# sourceMappingURL=${sourceMapUrl}*/\n`;
        }else{
            updatedContent = generatedContent + `\n//# sourceMappingURL=${sourceMapUrl}\n`;
        }
         
        fs.writeFileSync(this.generatedFilePath, updatedContent);
    }
}

function parseArgs(args) {
    const params = {};
    args.forEach(arg => {
        const [key, value] = arg.split('=');
        if (key && value) {
            params[key] = value;
        }
    });
    return params;
}

//https://stackoverflow.com/questions/26246601/wildcard-string-comparison-in-javascript
function matchRuleShort(str, rule) {
    var escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    return new RegExp("^" + rule.split("*").map(escapeRegex).join(".*") + "$").test(str);
}
 
function removeBOM(content) {
    return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
}