import { HttpClientModule } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { FormComponent } from '../form/form.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Instance, InstanceState } from '../model/instance';
import { CommonModule } from '@angular/common';
import { Constants } from '../constants/constants';

@Component({
  selector: 'app-instance',
  standalone: true,
  imports: [
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    HttpClientModule,
    FormComponent,
    MatProgressSpinnerModule,
    CommonModule
  ],
  templateUrl: './instance.component.html',
  styleUrl: './instance.component.css',
})
export class InstanceComponent implements OnInit {
  @Input() vscode?: any
  panelOpenState = false;
  @Input() remove!: (_: number) => void
  @Input() instance!: Instance
  @Input() index!: number
  @Input() isInValidName!: (name: string) => boolean
  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    this.registerIcons()
  }
  ngOnInit(): void {
  }

  runTomcat(event: Event) {
    event.stopPropagation()
    this.vscode?.postMessage({
      action: Constants.EVENT_RUN,
      instance: this.instance
    })
  }
  stopTomcat(event: Event) {
    event.stopPropagation()
    this.vscode?.postMessage({
      action: Constants.EVENT_STOP,
      instance: this.instance
    })
  }

  onSave = (instance: Instance) => {
    this.vscode?.postMessage({ action: Constants.EVENT_SAVE, instance: this.instance })
  }

  private registerIcons() {
    this.matIconRegistry.addSvgIcon(
      'run',
      this.domSanitizer.bypassSecurityTrustResourceUrl("assets/run.svg")
    );
    this.matIconRegistry.addSvgIcon(
      'stop',
      this.domSanitizer.bypassSecurityTrustResourceUrl("assets/stop.svg")
    );
    this.matIconRegistry.addSvgIcon(
      're-run',
      this.domSanitizer.bypassSecurityTrustResourceUrl("assets/re-run.svg")
    );
    this.matIconRegistry.addSvgIcon(
      'delete',
      this.domSanitizer.bypassSecurityTrustResourceUrl("assets/delete.svg")
    );
    this.matIconRegistry.addSvgIcon(
      'debug',
      this.domSanitizer.bypassSecurityTrustResourceUrl("assets/debug.svg")
    );
  }

  isRunning(): boolean {
    return this.instance.state == InstanceState.RUNNING
  }
  isProcessing(): boolean {
    return this.instance.state === InstanceState.PROCESSING
  }
  isDebugging(): boolean {
    return this.instance.state == InstanceState.DEBUGGING
  }
  isIdle(): boolean {
    return this.instance.state == InstanceState.IDLE
  }
}
