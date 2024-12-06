import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InstanceComponent } from './instance/instance.component';
import { Instance } from './model/instance';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Constants } from './constants/constants';
import { v4 as uuid } from "uuid"
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer } from '@angular/platform-browser';



declare function acquireVsCodeApi(): any;
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    InstanceComponent,
    CommonModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule
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

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    this.vscode = acquireVsCodeApi()
    this.registerIcon()
  }
  ngOnDestroy(): void {
    this.vscode.postMessage({ action: 'on-destroy' })
  }

  ngOnInit(): void {
    this.initObserver()
    this.vscode.postMessage({ action: Constants.UI_INIT })
  }

  addInstance() {
    this.instances.push(new Instance())
    this.vscode.postMessage({ action: 'test', data: this.instances })
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
          this.changeDetectorRef.detectChanges()
          return
        case Constants.PROJECT_LOADED:
          this.loadData(event.data.data)
          this.loading = false
          this.changeDetectorRef.detectChanges()
          return
        case Constants.PROJECT_ERROR:
          this.loading = false
          this.changeDetectorRef.detectChanges()
          return
        case Constants.PROJECT_LOADING:
          this.loading = true
          this.changeDetectorRef.detectChanges()
          return
        case Constants.UI_STATE_UPDATE:
          this.loadData(event.data.data.instances)
          this.loading = false
          this.changeDetectorRef.detectChanges()
          return
      }
    })
  }

  private loadData(instances: Instance[]) {
    this.vscode.postMessage({ action: 'test', data: 'instances how ???' })
    try {
      this.instances = instances.map(instance => {
        instance.isSaved = true
        return instance
      })
    } catch (err) {
      this.vscode.postMessage({ action: 'test', data: (err as Error).message })
    }
  }

  updateInstance(instance: Instance) {
    this.vscode.postMessage({
      action: 'test', data: {
        msg: 'before',
        data: this.instances
      }
    })
    this.instances?.forEach(inst => {
      if (instance.instanceId == inst.instanceId) {
        inst.state = instance.state
      }
    })
    this.vscode.postMessage({
      action: 'test', data: {
        msg: 'after',
        data: this.instances
      }
    })
    this.changeDetectorRef.detectChanges()
  }


  isInvalidName = (name: string): boolean => {
    return this.instances.find(inst => inst.instanceName === name) != undefined
  }

  private registerIcon = () => {
    this.matIconRegistry.addSvgIcon(
      'add',
      this.domSanitizer.bypassSecurityTrustResourceUrl("assets/add.svg")
    );
  }
}

class ProjectState {
  projectName!: string
  projectType!: string
  error!: boolean
  errorMsg!: string
  instances: Instance[] = []
}
