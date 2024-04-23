import { EventHandler } from "../ui/event.handler";
import { Constants } from "./constants";
import { Instance, TomcatConfig } from "./tomcat.config";
import { TomcatRunnerUtils } from "./tomcat.runner.utils";
import * as fs from "fs";
import * as xml2js from "xml2js"
import * as vscode from 'vscode';

type ProjectConfig = {
    projectName: string,
    projectType: string,
    instances: TomcatConfig[]
}

export class ConfigManager {
    private _projectConfig?: ProjectConfig
    constructor(
        private onConfigReady: (_: boolean, __: { [key: string]: any }) => void,
        private onProjectConfigReady: (_: boolean, __?: string) => void,
        private onSave: (__: boolean, _: TomcatConfig) => void,
        private onDelete: (_: boolean, __: TomcatConfig) => void,
        private workspaceDir: string
    ) {
        this.readConfig(true)
    }


    setupConfig(config: { [key: string]: any }) {
        const tomcatConfig: TomcatConfig = config.tomcatConfig
        console.log(tomcatConfig.workingDir)
        Promise.all([
            TomcatRunnerUtils.copyDir(`${tomcatConfig.tomcatHome}/conf`, `${TomcatRunnerUtils.getDestDir(tomcatConfig)}/conf`),
            TomcatRunnerUtils.compile(tomcatConfig),
            TomcatRunnerUtils.generateDependencyFile(tomcatConfig)
        ]).then((res) => {
            const [copySuccess, compileSuccess, generationSuccess] = res
            if (!copySuccess || !compileSuccess || !generationSuccess) {
                vscode.window.showErrorMessage("Some error occured")
                this.onConfigReady(false, config)
                return
            }
            this.editConfigs(config)
        })
    }

    private editConfigs(config: { [key: string]: any }) {
        const tomcatConfig: TomcatConfig = config.tomcatConfig
        console.log(config)
        Promise.all([
            TomcatRunnerUtils.editConfig(tomcatConfig),
            this.generateCatalinaConfig(tomcatConfig)
        ]).then(res => {
            const [confEditSuccess, contextWriteSuccess] = res
            if (!confEditSuccess || !contextWriteSuccess) {
                vscode.window.showErrorMessage("Some error occured")
                this.onConfigReady(false, config)
                return
            }
            this.onConfigReady(true, config)
        })
    }

    private generateCatalinaConfig = (tomcatConfig: TomcatConfig): Promise<boolean> => {
        return new Promise<boolean>((resolve, _reject) => {
            this.findDependencies(TomcatRunnerUtils.getDestDir(tomcatConfig), (data: string[]) => {
                const obj = this.createXmlObj(data, tomcatConfig)
                const builder = new xml2js.Builder()
                const xmlObj = builder.buildObject(obj)
                if (TomcatRunnerUtils.catalinaConfigExists(tomcatConfig))
                    TomcatRunnerUtils.deleteCatalinaConfig(tomcatConfig)
                TomcatRunnerUtils.createLocalhostFolder(tomcatConfig)
                fs.writeFile(TomcatRunnerUtils.getContextOutputPath(tomcatConfig), xmlObj, (err) => {
                    if (err != null) {
                        console.log('Context file write Failure ' + err.message)
                        vscode.window.showErrorMessage("Some error occured")
                    }
                    else {
                        console.log('Context file wirte Success')
                        resolve(err == null)
                    }
                })
            })
        })
    }

    private createXmlObj(data: string[], tomcatConfig: TomcatConfig): Object {
        let Context = {
            Context: {
                $: {
                    docBase: `${tomcatConfig.workingDir}/src/main/webapp`
                },
                Resources: {
                    $: {
                        cacheMaxSize: '10240'
                    },
                    PreResources: [
                        {
                            $: {
                                base: `${tomcatConfig.workingDir}/target/classes`,
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
                        base: TomcatRunnerUtils.getJarPath(line),
                        className: 'org.apache.catalina.webresources.FileResourceSet',
                        webAppMount: `/WEB-INF/lib/${TomcatRunnerUtils.getJarFile(line)}`
                    }
                }
            }
            Context.Context.Resources.PreResources.push(postResource.PostResources)
        })
        return Context
    }

    private findDependencies(dir: string, callback: (data: string[]) => void) {
        fs.readFile(`${dir}/${Constants.DEPENDENCY_FILE_NAME}`, 'utf8', (err, data) => {
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

    save(tomcatConfig: TomcatConfig) {
        tomcatConfig.workingDir = this.workspaceDir
        console.log('attempting save')
        const alreadyExist = this._projectConfig?.instances.find(inst => inst.instanceId === tomcatConfig.instanceId)
        if (alreadyExist) {
            if (this._projectConfig?.instances)
                this._projectConfig.instances = this._projectConfig.instances
                    .map(inst => {
                        if (inst.instanceId === tomcatConfig.instanceId)
                            return Instance.from(tomcatConfig)
                        return inst
                    })
        } else {
            if (!this._projectConfig)
                this._projectConfig = {
                    projectName: tomcatConfig.projectName,
                    projectType: 'maven',
                    instances: []
                }
            this._projectConfig?.instances.push(Instance.from(tomcatConfig))
        }
        console.log('config status', this._projectConfig)
        this.writeConfig((err) => {
            if (err)
                console.log(err.message)
            this.readConfig(false)
            this.onSave(err == null, tomcatConfig)
        })
    }

    delete(tomcatConfig: TomcatConfig) {

    }

    private writeConfig(onSuccess: (err: any) => void) {
        if (this._projectConfig) {
            const writeData = JSON.stringify(this._projectConfig)
            fs.writeFile(TomcatRunnerUtils.getConfigPath(this._projectConfig.projectName), writeData, onSuccess)
        }
    }

    private readConfig(isProjectConfig: boolean) {
        const workingFolder = this.workspaceDir.split('/').slice(-1)[0]
        if (TomcatRunnerUtils.projectConfigExists(workingFolder))
            fs.readFile(TomcatRunnerUtils.getConfigPath(workingFolder), (err, data) => {
                if (err) {
                    if (isProjectConfig) this.onProjectConfigReady(true, Constants.SOMETHING_WENT_WRONG)
                    return
                }
                console.log('project read success')
                this._projectConfig = JSON.parse(data.toString())
                if (isProjectConfig) this.onProjectConfigReady(false)
            })
        else {
            this.onProjectConfigReady(true, Constants.NO_CONFIG_FOUND)
            vscode.window.showInformationMessage("No configuration found for Tomcat")
        }
    }

    getInstances(): TomcatConfig[] {
        return this._projectConfig?.instances || []
    }
}