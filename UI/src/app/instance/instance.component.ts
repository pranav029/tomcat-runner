import { HttpClientModule } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { FormComponent } from '../form/form.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Instance } from '../model/instance';

@Component({
  selector: 'app-instance',
  standalone: true,
  imports: [
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    HttpClientModule,
    FormComponent,
    MatProgressSpinnerModule
  ],
  templateUrl: './instance.component.html',
  styleUrl: './instance.component.css',
})
export class InstanceComponent {
  @Input() vscode?: any
  instance: Instance
  panelOpenState = false;
  @Input() cancel?: () => void
  @Input() inst?: Instance
  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    this.registerIcons()
    this.instance = new Instance();
  }

  runTomcat(event: Event) {
    event.stopPropagation()
    this.vscode?.postMessage({
      action: 'run',
      instance: this.instance
    })
  }
  stopTomcat(event: Event) {
    event.stopPropagation()
    this.vscode?.postMessage({
      action: 'stop',
      instance: this.instance
    })
  }

  onSave = (instance: Instance) => {
    this.instance = instance
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
  }
}
