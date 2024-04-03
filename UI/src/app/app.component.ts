import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InstanceComponent } from './instance/instance.component';
import { Instance } from './model/instance';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Constants } from './constants/constants';



declare function acquireVsCodeApi(): any;
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    InstanceComponent,
    CommonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  vscode?: any
  instances: Instance[] = []
  error: boolean = false
  msg: String = 'init'
  message: string = 'message'
  loading: boolean = false

  constructor(private changeDetectorRef: ChangeDetectorRef) {
    this.vscode = acquireVsCodeApi()
  }
  ngOnDestroy(): void {
    this.vscode.postMessage({ action: 'on-destroy' })
    this.restoreState()
    this.vscode.postMessage('UI destoryed')
  }

  ngOnInit(): void {
    this.initObserver()
    this.restoreState()
    this.vscode.postMessage('UI started')
  }

  restoreState() {
    this.instances = this.vscode.getState()?.instances || []
    this.loading = this.vscode.getState()?.loading || false
  }

  addInstance() {
    this.instances.push(new Instance())
    console.log('The length is: ' + this.instances.length)
    this.changeDetectorRef.detectChanges()
  }

  remove = (index: number) => {
    this.instances.splice(index, 1)
    this.changeDetectorRef.detectChanges()
  }

  initObserver() {
    window.addEventListener('message', event => {
      event.stopPropagation()
      switch (event.data.type) {
        case Constants.UPDATE_INSTANCE:
          this.loading = false
          this.updateInstance(event.data.data)
          this.updateState()
          this.changeDetectorRef.detectChanges()
          return
        case Constants.PROJECT_LOADED:
          this.loadData(event.data.data)
          this.loading = false
          this.updateState()
          this.changeDetectorRef.detectChanges()
          return
        case Constants.PROJECT_ERROR:
          this.loading = false
          this.updateState()
          this.changeDetectorRef.detectChanges()
          return
        case Constants.PROJECT_LOADING:
          this.loading = true
          this.updateState()
          this.changeDetectorRef.detectChanges()
          return
      }
    })
  }

  private loadData(instances: Instance[]) {
    const obj: Instance[] = { ...instances }
    this.instances = obj.map(instance => {
      instance
      instance.isSaved = true
      return instance
    })
  }

  updateInstance(instance: Instance) {
    this.instances?.forEach(inst => {
      if (instance.instanceName === inst.instanceName) {
        inst.running = instance.running
        inst.processing = instance.processing
        inst.isSaved = true
      }
    })
    this.updateState()
    this.changeDetectorRef.detectChanges()
  }

  private updateState() {
    this.vscode.setState({
      loading: this.loading,
      message: this.msg,
      instances: this.instances
    })
  }

  isInvalidName = (name: string): boolean => {
    return this.instances.find(inst => inst.instanceName === name) != undefined
  }
}

class ProjectState {
  projectName!: string
  projectType!: string
  error!: boolean
  errorMsg!: string
  instances: Instance[] = []
}
