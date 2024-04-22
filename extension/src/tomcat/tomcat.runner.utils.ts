import { exec } from "child_process"
import { homedir } from "os"
import { TomcatConfig } from "./tomcat.config"
import * as fs from "fs";
import * as xml2js from "xml2js"
import { Constants } from "./constants";
import { Uri } from "vscode";
import { join } from "path";
import { JavaHomeNotFoundException } from "./exceptions";


export abstract class TomcatRunnerUtils {
    public static copyDir(sourceDir: string, destDir: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            fs.cp(sourceDir, destDir, { recursive: true }, err => {
                if (err) {
                    console.log(err)
                    console.log('Config File copy failed')
                    resolve(false)
                } else {
                    console.log('Config File copy succeded')
                    resolve(true)
                }
            })
        })
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
        return join(
            homedir(),
            '.tomcatRunner',
            tomcatConfig.projectName,
            tomcatConfig.instanceName,
            Constants.DEPENDENCY_FILE_NAME
        )
    }
    public static generateDependencyFile(tomcatConfig: TomcatConfig): Promise<boolean> {
        return new Promise<boolean>((resolve, _reject) => {
            const command = `cd ${tomcatConfig.workingDir} && mvn dependency:list -DoutputFile=${this.getDependencyFilePath(tomcatConfig)}`
            exec(command, err => {
                console.log(err?.message)
                console.log(`Dependency generation ${err == null ? 'success' : 'failed'}`)
                resolve(err == null)
            })
        })
    }
    public static editConfig(tomcatConfig: TomcatConfig): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const path = `${TomcatRunnerUtils.getDestDir(tomcatConfig)}/conf/server.xml`
            const xmlbuffer = fs.readFileSync(path)
            const parser = new xml2js.Parser();
            parser.parseString(xmlbuffer.toString(), function (err, result) {
                const xmlDoc = result
                xmlDoc.Server.Service[0].Connector[0].$.port = tomcatConfig.serverPort
                xmlDoc.Server.$.port = tomcatConfig.adminPort
                const builder = new xml2js.Builder()
                const res = builder.buildObject(xmlDoc)
                fs.writeFile(path, res, (e) => {
                    console.log(`Server config write ${err == null ? 'success' : 'failed'}`)
                    resolve(e == null)
                })
            });
        })
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

    public static isMavenProject(workspaceDir: Uri) {
        return fs.existsSync(Uri.joinPath(workspaceDir, 'pom.xml').fsPath)
    }

    public static compile(tomcatConfig: TomcatConfig): Promise<boolean> {
        return new Promise<boolean>((resolve, _reject) => {
            exec(`cd ${tomcatConfig.workingDir}& mvn compile`, err => {
                console.log(`Compile ${err == null ? 'success' : 'failure'}`)
                resolve(err == null)
            })
        })
    }

    private static getBaseCommand(tomcatConfig: TomcatConfig, debug?: boolean): string[] {
        const CATALINA_BASE = TomcatRunnerUtils.getDestDir(tomcatConfig)
        const command = []
        const javaHome = process.env.JAVA_HOME
        if (!javaHome)
            throw new JavaHomeNotFoundException('JAVA_HOME not exits')
        const javaPath = join(javaHome.replace(/\\/g, '/'), 'bin', 'java.exe')
        command.push(`"${javaPath}"`)
        if (debug)
            command.push(`-agentlib:jdwp=transport=dt_socket,address=8090,suspend=y,server=y`)
        command.push(`-Dcatalina.home=${tomcatConfig.tomcatHome}`)
        command.push(`-Dcatalina.base=${CATALINA_BASE}`)
        command.push(`-Djava.io.tmpdir=${CATALINA_BASE}/temp`)
        command.push(`-Djava.util.logging.config.file=${CATALINA_BASE}/conf/logging.properties`)
        command.push(`-Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager`)
        command.push(`-Dfile.encoding=UTF-8`)
        command.push(`-classpath`)
        command.push(`${tomcatConfig.tomcatHome}/bin/bootstrap.jar;${tomcatConfig.tomcatHome}/bin/tomcat-juli.jar`)
        command.push(`org.apache.catalina.startup.Bootstrap`)
        return command
    }
    public static getStartCommand(tomcatConfig: TomcatConfig,debug?:boolean): string {
        const command = this.getBaseCommand(tomcatConfig,debug)
        command.push('start')
        return command.join(' ')
    }

    public static getStopCommand(tomcatConfig: TomcatConfig): string {
        const command = this.getBaseCommand(tomcatConfig)
        command.push('stop')
        return command.join(' ')
    }

    public static projectConfigExists(projectName: string): boolean {
        return fs.existsSync(this.getConfigPath(projectName))
    }

    public static getConfigPath(projectName: string): string {
        return join(homedir(), '.tomcatRunner', projectName, Constants.PROJECT_METADATA_FILE)
    }

}
