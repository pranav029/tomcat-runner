import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Instance } from '../model/instance';
import { TomcatRunnerValidators } from './form.validators';
declare function acquireVsCodeApi(): any;
@Component({
  selector: 'app-form',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './form.component.html',
  styleUrl: './form.component.css'
})
export class FormComponent implements OnInit {
  instanceForm!: FormGroup
  @Input() instance!: Instance
  @Input() save!: (instance: Instance) => void
  @Input() isInvalidName!: (name: string) => boolean
  @Input() vscode!: any
  constructor(private formBuilder: FormBuilder) { }

  ngOnInit(): void {
    this.initForm()
  }

  onSave() {
    this.updateInstance()
    this.save(this.instance)
  }

  private initForm() {
    this.instanceForm = this.formBuilder.group({
      tomcatHome: [this.instance.tomcatHome, Validators.required],
      instanceName: [this.instance.instanceName, Validators.compose([Validators.required, TomcatRunnerValidators.validName(this.isInvalidName,this.instance)])],
      serverPort: [this.instance.serverPort, Validators.compose([Validators.required, TomcatRunnerValidators.validPort])],
      adminPort: [this.instance.adminPort, Validators.compose([Validators.required, TomcatRunnerValidators.validPort])],
      contextPath: [this.instance.contextPath, Validators.required]
    })
  }

  private updateInstance() {
    const values: Instance = this.instanceForm.getRawValue()
    this.instance.tomcatHome = values.tomcatHome.trim()
    this.instance.instanceName = values.instanceName.trim()
    this.instance.serverPort = values.serverPort
    this.instance.adminPort = values.adminPort
    this.instance.contextPath = values.contextPath.trim()
  }

  areValuesSame(): boolean {
    const values: Instance = this.instanceForm.getRawValue()
    if (this.instance.tomcatHome != values.tomcatHome.trim()) return false
    if (this.instance.instanceName != values.instanceName.trim()) return false
    if (this.instance.serverPort != values.serverPort) return false
    if (this.instance.adminPort != values.adminPort) return false
    if (this.instance.contextPath != values.contextPath.trim()) return false
    return true
  }
}
