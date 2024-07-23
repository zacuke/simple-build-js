# Simple Build JS and CSS

Dependency free javascript and css file concatenation and source map generation. Recursively searches from the root of project and looks for any matching files and generates single output file.

## Installation

1. Add the package to your project:
    ```sh
    npm install simple-build-js
    ```
2. Add the following to your package.json
    ```json
      "scripts": {
        "build-js": "node node_modules/simple-build-js/build-scripts.js outputFile=site.min.js extension=.js",
        "build-css": "node node_modules/simple-build-js/build-scripts.js outputFile=site.min.css extension=.css excludeFiles=*.razor.css"
    },
    ```
3. Optionally, with traditional Visual Studio add the following to your `.csproj` file or other msbuild task to automate npm install and build:

    ```xml
	<Target Name="PreBuild" BeforeTargets="Build" Condition="!Exists('node_modules')">
		<Exec Command="npm install" />
	</Target>
	<Target Name="BuildJsCss" BeforeTargets="Build">
		<Exec Command="npm run --silent build-js" />
		<Exec Command="npm run --silent build-css" />
	</Target>
    ```

    - Or somehow call the script manually.

3. Add reference to generated output:
   ```html
   <script src="site.min.js"></script>
   <link rel="stylesheet" href="site.min.css">
   ``` 

## Configuration

1. Available parameters

     
    - outputDir=The directory of the output file.
    - outputFile=The name of the output file.
    - excludeDirs=Directories to exclude from recursive search. 
      - Node_modules, bin, and obj are always excluded.
    - extension=Extension to include in recursive search.
    - excludefiles=Wildcard compatible files to exclude. 
     
2. Defaults
    ```js
    outputDir='wwwroot'
    outputFile='site.min.js'
    excludeDirs = ['node_modules', 'wwwroot', 'bin', 'obj']
    extension = '.js'
    ```
3. Note
    ```
    Needs to be ran from the root of project, as recursive search begins from current work directory.
    ```