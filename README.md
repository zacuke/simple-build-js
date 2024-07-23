# Simple Build JS and CSS

Dependency free javascript and css file concatenation and source map generation. Recursively searches from the root of project and looks for any matching files and generates single output file.

## Installation

1. Add the package to your project:
    ```sh
    npm install simple-build-js
    ```

2. Add the following to your `.csproj` file to automate the npm install and build process:

    ```xml
	<Target Name="PreBuild" BeforeTargets="Build" Condition="!Exists('node_modules')">
		<Exec Command="npm install" />
	</Target>
	<Target Name="BuildJs" BeforeTargets="Build">
		<Exec Command="node node_modules/simple-build-js/build-scripts.js outputFile=site.min.js extension=.js" />
	</Target>
	<Target Name="BuildCss" BeforeTargets="Build">
		<Exec Command="node node_modules/simple-build-js/build-scripts.js outputFile=site.min.css extension=.css excludeFiles=*.razor.css" />
	</Target>
    ```

3. Add reference to generated output:
   ```html
   <script src="site.min.js"></script>
   <link rel="stylesheet" href="site.min.css">
   ``` 

## Configuration

1. Available parameters

     
    - jsOutputDir=The directory of the output file.
    - outputFile=The name of the output file.
    - excludeDirs=Directories to exclude from recursive search. 
      - Node_modules, bin, and obj are always excluded.
    - extension=Extension to include in recursive search.
    - excludefiles=Wildcard compatible files to exclude. 
     
2. Defaults
    ```js
    jsOutputDir='wwwroot'
    outputFile='site.min.js'
    excludeDirs = ['node_modules', 'wwwroot']
    extension = '.js'
    ```
3. Example to build css files
    ```sh
    node node_modules/simple-build-js/build-scripts.js jsOutputDir=cssfiles outputFile=site.min.css excludeDirs=node_modules,dist,cssfiles
    ```
4. Note
    ```
    Needs to be ran from the root of project, as recursive search begins from current work directory.

    Files ending with razor.css are excluded.
    ```