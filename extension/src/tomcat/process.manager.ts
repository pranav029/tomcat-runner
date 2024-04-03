import { ChildProcess, exec, execSync, spawn } from "child_process";
import { TomcatConfig } from "./tomcat.config";

export class ProcessManager {
    private _processes: Map<string, ChildProcess>
    constructor() {
        this._processes = new Map()
    }

    execute(instanceName: string, command: string): ChildProcess {
        const childProcess = exec(command)
        this._processes.set(instanceName, childProcess)
        return childProcess
    }

    getProcess(instanceName: string): ChildProcess | undefined {
        return this._processes.get(instanceName)
    }

    kill(instanceName: string, command: string, onProcessKilled: () => void) {
        // this.stopServer(command, () => {
        //     this._processes.get(instanceName)?.kill()
        //     this._processes.delete(instanceName)
        //     onProcessKilled()
        // })
        console.log('killing')
        const pid = this._processes.get(instanceName)?.pid
        // this._processes.delete(instanceName)
        // console.log(temp)
        // onProcessKilled()
        if (pid) exec(`taskkill /pid ${pid} /f /t`, () => {
            this._processes.delete(instanceName)
            console.log(pid)
            onProcessKilled()
        })

    }

    stopServer(command: string, onServerStop: () => void) {
        if (command.length > 0)
            exec(command, onServerStop)
    }
}