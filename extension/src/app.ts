import { ChildProcess, exec, execSync } from "child_process";
import * as fs from "fs";
import { homedir } from "os";
import { LogOutputChannel, OutputChannel } from "vscode";
import * as vscode from 'vscode';
import * as xml2js from "xml2js"

const CATALINA_HOME = 'C:/apache-tomcat-10.1.15-windows-x64/apache-tomcat-10.1.15'
const TOMCAT_RUNNER_DIR = 'C:/Users/pranavmani.tripathi/.tomcatRunner'
const DEPENDENCY_FILE_NAME = 'dep.txt'


const TOMCAT_CONF_DIR = 'C:/apache-tomcat-10.1.15-windows-x64/apache-tomcat-10.1.15/conf'
abstract class FileSystemManipulator {
    public static copyDir(sourceDir: string, destDir: string) {
        fs.cpSync(sourceDir, destDir, { recursive: true })
        console.log('Config File copy succeded')
    }
    public static deleteCatalinaConfig(tomcatConfig: TomcatConfig) {
        const path = `${homedir}/.tomcatRunner/${tomcatConfig.projectName}/${tomcatConfig.instanceName}/conf/Catalina/localhost`
        if (fs.existsSync(path))
            fs.rmSync(path, { recursive: true })
    }
    public static catalinaConfigExists(tomcatConfig: TomcatConfig) {
        const path = `${homedir}/.tomcatRunner/${tomcatConfig.projectName}/${tomcatConfig.instanceName}/conf/Catalina/localhost`
        return fs.existsSync(path)
    }

    public static createLocalhostFolder(tomcatConfig: TomcatConfig) {
        const path = `${homedir}/.tomcatRunner/${tomcatConfig.projectName}/${tomcatConfig.instanceName}/conf/Catalina/localhost`
        fs.mkdirSync(path)
    }

    public static getDestDir(tomcatConfig: TomcatConfig): string {
        return `${homedir}/.tomcatRunner/${tomcatConfig.projectName}/${tomcatConfig.instanceName}`
    }

    public static getContextOutputPath(tomcatConfig: TomcatConfig): string {
        return `${homedir}/.tomcatRunner/${tomcatConfig.projectName}/${tomcatConfig.instanceName}/conf/Catalina/localhost/${tomcatConfig.contextPath}.xml`
    }
    public static getJarPath(line: string): string {
        const BASE_PATH = `${homedir}/.m2/repository`
        const [pkg, file, ext, ver] = line.split(':')
        const basePrefix = pkg.split('.').join('/').trim()
        return `${BASE_PATH}/${basePrefix}/${file}/${ver}/${this.getJarFile(line)}`
    }
    public static getJarFile(line: string): string {
        const [pkg, file, ext, ver] = line.split(':')
        return `${file}-${ver}.${ext}`
    }
    public static getDependencyFilePath(tomcatConfig: TomcatConfig): string {
        return `${TOMCAT_RUNNER_DIR}/${tomcatConfig.projectName}/${tomcatConfig.instanceName}/${DEPENDENCY_FILE_NAME}`
    }
    public static generateDependencyFile(tomcatConfig: TomcatConfig) {
        const command = `cd ${tomcatConfig.workingDir} && mvn dependency:list -DoutputFile=${this.getDependencyFilePath(tomcatConfig)}`
        console.log(command)
        return FileSystemManipulator.executeCommand(command)
    }
    public static editConfig(tomcatConfig: TomcatConfig, onSuccess: () => void) {
        const path = `${FileSystemManipulator.getDestDir(tomcatConfig)}/conf/server.xml`
        const xmlbuffer = fs.readFileSync(path)
        const parser = new xml2js.Parser();
        parser.parseString(xmlbuffer.toString(), function (err, result) {
            const xmlDoc = result
            xmlDoc.Server.Service[0].Connector[0].$.port = tomcatConfig.serverPort
            xmlDoc.Server.$.port = tomcatConfig.adminPort
            const builder = new xml2js.Builder()
            const res = builder.buildObject(xmlDoc)
            fs.writeFileSync(path, res)
            onSuccess()
        });
    }
    public static executeCommand(cmd: string) {
        return new Promise((update, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error != null)
                    update('Some error occured')
                else update('The output is: ' + stdout)
            })
        });
    }

    public static getServerLink(tomcatConfig: TomcatConfig): string {
        return `http://localhost:${tomcatConfig.serverPort}/${tomcatConfig.contextPath}\n`
    }

    public static isServerUp(data: String): boolean {
        return data.toString().includes('org.apache.catalina.startup.Catalina.start Server startup')
    }
}

export class TomcatConfig {
    instanceName!: string;
    adminPort!: string
    serverPort!: string;
    workingDir!: string;
    contextPath!: string;
    projectName!: string;
}

export class TomcatRunner {
    logger!: OutputChannel
    process?: ChildProcess
    constructor(private tomcatConfig: TomcatConfig) {
    }
    run() {
        this.copyConfFiles()
    }
    private copyConfFiles() {
        FileSystemManipulator.copyDir(TOMCAT_CONF_DIR, `${FileSystemManipulator.getDestDir(this.tomcatConfig)}/conf`)
        this.compile(() => {
            console.log('Compilation done')
            FileSystemManipulator.generateDependencyFile(this.tomcatConfig).then(() => {
                console.log('File generated')
                FileSystemManipulator.editConfig(this.tomcatConfig, () => {
                    console.log('Server config writing success')
                    this.generateCatalinaConfig()
                })
            })
        })
    }
    private onSuccessfulFileGeneration() {
        console.log('File generated')
        FileSystemManipulator.editConfig(this.tomcatConfig, () => {
            console.log('Server config writing success')
            this.generateCatalinaConfig()
        })
    }

    private generateCatalinaConfig() {
        this.findDependencies(FileSystemManipulator.getDestDir(this.tomcatConfig), (data: string[]) => {
            const obj = this.createXmlObj(data)
            const builder = new xml2js.Builder()
            const xmlObj = builder.buildObject(obj)
            if (FileSystemManipulator.catalinaConfigExists(this.tomcatConfig))
                FileSystemManipulator.deleteCatalinaConfig(this.tomcatConfig)
            FileSystemManipulator.createLocalhostFolder(this.tomcatConfig)
            fs.writeFile(FileSystemManipulator.getContextOutputPath(this.tomcatConfig), xmlObj, (err) => {
                if (err != null)
                    console.log('Context file write Failure ' + err.message)
                else {
                    console.log('Context file wirte Success')
                    this.runTomcat()
                }
            })
        })
    }

    private compile(onSuccess: () => void) {
        FileSystemManipulator.executeCommand(`${this.tomcatConfig.workingDir}/mvn compile`).then(() => onSuccess())
    }
    private createXmlObj(data: string[]): Object {
        let Context = {
            Context: {
                $: {
                    docBase: `${this.tomcatConfig.workingDir}/src/main/webapp`
                },
                Resources: {
                    $: {
                        cacheMaxSize: '10240'
                    },
                    PreResources: [
                        {
                            $: {
                                base: `${this.tomcatConfig.workingDir}/target/classes`,
                                className: 'org.apache.catalina.webresources.DirResourceSet',
                                webAppMount: '/WEB-INF/classes'
                            }
                        }
                    ]
                }
            }
        }
        data.forEach(line => {
            const postResource = {
                PostResources: {
                    $: {
                        base: FileSystemManipulator.getJarPath(line),
                        className: 'org.apache.catalina.webresources.FileResourceSet',
                        webAppMount: `/WEB-INF/lib/${FileSystemManipulator.getJarFile(line)}`
                    }
                }
            }
            Context.Context.Resources.PreResources.push(postResource.PostResources)
        })
        return Context
    }

    private findDependencies(dir: string, callback: (data: string[]) => void) {
        fs.readFile(`${dir}/${DEPENDENCY_FILE_NAME}`, 'utf8', (err, data) => {
            const processedData = data
                .split('\n')
                .filter(line => line.trim().length != 0)
                .filter(line => !line.includes('The following files have been resolved'))
                .filter(line => !line.includes('test'))
                .map(line => line.split(':compile')[0])
                .map(line => line.split(':runtime')[0])
            callback(processedData)
        })
    }

    private runTomcat() {
        const CATALINA_BASE = FileSystemManipulator.getDestDir(this.tomcatConfig)
        const str = `"C:/Program Files/Java/jdk-17/bin/java.exe" -Dcatalina.home=${CATALINA_HOME} -Dcatalina.base=${CATALINA_BASE} -Djava.io.tmpdir=${CATALINA_BASE}/temp -Djava.util.logging.config.file=${CATALINA_BASE}/conf/logging.properties -Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager -Dfile.encoding=UTF-8 -classpath ${CATALINA_HOME}/bin/bootstrap.jar;${CATALINA_HOME}/bin/tomcat-juli.jar  org.apache.catalina.startup.Bootstrap start`
        this.process = exec(`${str}`)
        this.stopServer(() => {
            this.logger = vscode.window.createOutputChannel(this.tomcatConfig.instanceName)
            this.logger.show()
            this.process?.stdout?.on('data', (data) => {
                this.logger.appendLine(data.toString())
            })
            this.process?.stderr?.on('data', (data) => {
                this.logger.appendLine(data.toString())
                if (FileSystemManipulator.isServerUp(data))
                    this.logger.appendLine(FileSystemManipulator.getServerLink(this.tomcatConfig))
            })
        })
    }

    public stop() {
        this.process?.kill()
        this.logger.dispose()
    }

    private stopServer(onStop: () => void) {
        const CATALINA_BASE = FileSystemManipulator.getDestDir(this.tomcatConfig)
        const str = `"C:/Program Files/Java/jdk-17/bin/java.exe" -Dcatalina.home=${CATALINA_HOME} -Dcatalina.base=${CATALINA_BASE} -Djava.io.tmpdir=${CATALINA_BASE}/temp -Djava.util.logging.config.file=${CATALINA_BASE}/conf/logging.properties -Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager -Dfile.encoding=UTF-8 -classpath ${CATALINA_HOME}/bin/bootstrap.jar;${CATALINA_HOME}/bin/tomcat-juli.jar  org.apache.catalina.startup.Bootstrap stop`
        exec(`${str}`, onStop)
    }
}









export function getConfig(): TomcatConfig {
    const tomcatConfig: TomcatConfig = new TomcatConfig()
    tomcatConfig.contextPath = 'bhavin'
    tomcatConfig.instanceName = 'Textion'
    tomcatConfig.serverPort = '8083'
    tomcatConfig.workingDir = 'C:/cgiTraining/JpaWebApp'
    tomcatConfig.projectName = 'JpaWebApp'
    return tomcatConfig
}

// main()


// const workingDir = this._vscodeUri.path.substring(1, this._vscodeUri.fsPath.length+1)
// console.log(workingDir)
// const indexFile = fs.readFileSync(join(workingDir, 'dist', 'ui', 'browser', 'index.html')).toString()
// const basePath = join(this._vscodeUri.fsPath, 'dist', 'ui', 'browser')
// const baseUri = webviewView.webview.asWebviewUri(Uri.parse(basePath))
// console.log(indexFile.replace('<base href="/">', `<base href="${baseUri.toString()}">`))
// webviewView.webview.html = indexFile.replace('<base href="/">', `<base href="${String(baseUri)}">`)