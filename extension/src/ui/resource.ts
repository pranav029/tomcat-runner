import { Instance } from "../tomcat/tomcat.config"

export interface ProjectState {
    projectName?: string
    projectType?: string
    error?: boolean
    errorMsg?: string
    instances?: Instance[]
    loading?:boolean
}

export class InstanceState {

}



