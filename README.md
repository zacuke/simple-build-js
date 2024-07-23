# Simple Build JS

A simple Node.js script to concatenate JavaScript files and generate source maps for ASP.NET projects.

## Installation

1. Add the package to your project:
    ```sh
    npm install simple-build-js
    ```

2. Add the following to your `.csproj` file to automate the npm install and build process:

    ```xml
    <Target Name="PreBuild" BeforeTargets="Build" Condition="!Exists('node_modules')">
        <Exec Command="npm install"  />
    </Target>
    <Target Name="BuildJs" BeforeTargets="Build">
        <Exec Command="node node_modules/simple-build-js/build-scripts.js" />
    </Target>
    ```

## Configuration

If you need to change the configuration it's hard coded right now so open a github issue.

```javascript
const jsOutputDir = 'wwwroot';
const outputFile = 'site.min.js';
const excludeDirs = ['node_modules', 'wwwroot'];
```