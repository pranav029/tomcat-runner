import { ChangeDetectorRef, Component, OnInit, importProvidersFrom } from '@angular/core';
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
export class AppComponent implements OnInit {
  vscode?: any
  instances: Instance[] = [new Instance()]

  constructor(private changeDetectorRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.vscode = acquireVsCodeApi()
  }

  addInstance() {
    this.instances.push(new Instance())
    console.log('The length is: ' + this.instances.length)
    this.changeDetectorRef.detectChanges()
  }

  cancel = () => {
    this.instances = this.instances.slice(0, this.instances.length)
    this.changeDetectorRef.detectChanges()
  }
}
