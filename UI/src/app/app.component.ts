import { ChangeDetectorRef, Component, OnDestroy, OnInit, importProvidersFrom } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient, HttpClientModule } from "@angular/common/http";
import { MatIconRegistry } from "@angular/material/icon";
import { DomSanitizer } from "@angular/platform-browser";
import { InstanceComponent } from './instance/instance.component';
import { Instance } from './model/instance';
import { CommonModule } from '@angular/common';

const NO_PROJECT_FOUND = 'no-project-found'
const PROJECT_LOADING = 'project-loading'

declare function acquireVsCodeApi(): any;
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    InstanceComponent,
    CommonModule
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
    const state = this.vscode.getState() || { message: 'empty state' }
    this.msg = state.message
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
      this.vscode.postMessage({ action: 'test', instance: event.data.type })
      event.stopPropagation()
      switch (event.data.type) {
        case 'update-instance':
          this.msg = ''
          this.updateInstance(event.data.data)
          return
        case 'project-loaded':
          this.instances.push(event.data.data)
          this.msg = this.instances.length > 0 ? '' : 'No Projects.'
          return
        case 'no-project-found':
          this.msg = event.data.data || 'no data found'
          this.message = 'no-project-found'
          this.vscode.setState({ message: event.data.data })
          this.vscode.postMessage({ action: 'test', instance: 'Test instance' })
          this.changeDetectorRef.detectChanges()
          return
      }
    })
  }

  updateInstance(instance: Instance) {
    this.instances?.forEach(inst => {
      if (instance.instanceName === inst.instanceName) {
        inst.running = instance.running
        inst.processing = instance.processing
      }
    })
    this.instances.push(instance)
    this.changeDetectorRef.detectChanges()
  }
}
