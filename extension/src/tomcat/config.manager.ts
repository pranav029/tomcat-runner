import { DEPENDENCY_FILE_NAME, TOMCAT_CONF_DIR } from "./constants";
import { TomcatConfig } from "./tomcat.config";
import { TomcatRunnerUtils } from "./tomcat.runner.utils";
import * as fs from "fs";
import * as xml2js from "xml2js"


export class ConfigManager {
    constructor(
        private onConfigReady: (_: TomcatConfig) => void,
        private workspaceDir: string
    ) { }

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
}