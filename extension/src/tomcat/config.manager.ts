import { EventHandler } from "../ui/event.handler";
import { Constants } from "./constants";
import { Instance, TomcatConfig } from "./tomcat.config";
import { TomcatRunnerUtils } from "./tomcat.runner.utils";
import * as fs from "fs";
import * as xml2js from "xml2js"

type ProjectConfig = {
    projectName: string,
    projectType: string,
    instances: TomcatConfig[]
}

export class ConfigManager {
    private projectConfig?: ProjectConfig
    constructor(
        private onConfigReady: (_: TomcatConfig) => void,
        private onProjectConfigReady: (_: boolean, __?: string) => void,
        private onSave: (__: boolean, _: TomcatConfig) => void,
        private onDelete: (_: boolean, __: TomcatConfig) => void,
        private workspaceDir: string
    ) {
        this.readConfig()
    }

    setupConfig(tomcatConfig: TomcatConfig) {
        console.log(tomcatConfig.workingDir)
        Promise.all([
            TomcatRunnerUtils.copyDir(`${tomcatConfig.tomcatHome}/conf`, `${TomcatRunnerUtils.getDestDir(tomcatConfig)}/conf`),
            TomcatRunnerUtils.compile(tomcatConfig),
            TomcatRunnerUtils.generateDependencyFile(tomcatConfig)
        ]).then((res) => {
            const [copySuccess, compileSuccess, generationSuccess] = res
            if (!copySuccess) return
            if (!compileSuccess) return
            if (!generationSuccess) return
            this.editConfigs(tomcatConfig)
        })
    }

    private editConfigs(tomcatConfig: TomcatConfig) {
        Promise.all([
            TomcatRunnerUtils.editConfig(tomcatConfig),
            this.generateCatalinaConfig(tomcatConfig)
        ]).then(res => {
            const [confEditSuccess, contextWriteSuccess] = res
            if (!confEditSuccess) return
            if (!contextWriteSuccess) return
            this.onConfigReady(tomcatConfig)
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
                    if (err != null)
                        console.log('Context file write Failure ' + err.message)
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
        const alreadyExist = this.projectConfig?.instances.find(inst => inst.instanceName === tomcatConfig.instanceName)
        if (alreadyExist) {
            if (this.projectConfig?.instances)
                this.projectConfig.instances = this.projectConfig.instances
                    .map(inst => {
                        if (inst.instanceName === tomcatConfig.instanceName)
                            return Instance.from(tomcatConfig)
                        return inst
                    })
        } else {
            if (!this.projectConfig)
                this.projectConfig = {
                    projectName: tomcatConfig.projectName,
                    projectType: 'maven',
                    instances: []
                }
            this.projectConfig?.instances.push(Instance.from(tomcatConfig))
        }
        console.log('config status', this.projectConfig)
        this.writeConfig((err) => {
            if (err)
                console.log(err.message)
            this.onSave(err == null, tomcatConfig)
        })
    }

    delete(tomcatConfig: TomcatConfig) {

    }

    private writeConfig(onSuccess: (err: any) => void) {
        if (this.projectConfig) {
            const writeData = JSON.stringify(this.projectConfig)
            fs.writeFile(TomcatRunnerUtils.getConfigPath(this.projectConfig.projectName), writeData, onSuccess)
        }
    }

    private readConfig() {
        if (TomcatRunnerUtils.projectConfigExists(this.workspaceDir))
            fs.readFile(TomcatRunnerUtils.getConfigPath(this.workspaceDir), (err, data) => {
                if (err) {
                    this.onProjectConfigReady(true, Constants.SOMETHING_WENT_WRONG)
                    return
                }
                this.projectConfig = JSON.parse(data.toString())
                this.onProjectConfigReady(false)
            })
        else this.onProjectConfigReady(true, Constants.NO_CONFIG_FOUND)

    }

    getInstances(): TomcatConfig[] {
        return this.projectConfig?.instances || []
    }
}