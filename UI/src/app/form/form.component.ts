import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Instance } from '../model/instance';

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
  @Input() save?: ((instance: Instance) => void)
  constructor(private formBuilder: FormBuilder) { }

  ngOnInit(): void {
    this.initForm()
  }

  onSave() {
    this.save?.(this.instanceForm.getRawValue())
  }

  private initForm() {
    this.instanceForm = this.formBuilder.group({
      tomcatHome:[this.instance.tomcatHome, Validators.required],
      instanceName: [this.instance.instanceName, Validators.required],
      serverPort: [this.instance.serverPort, Validators.compose([Validators.required, Validators.minLength(4), Validators.maxLength(4)])],
      adminPort: [this.instance.adminPort, Validators.compose([Validators.required, Validators.minLength(4), Validators.maxLength(4)])],
      contextPath: [this.instance.contextPath, Validators.required]
    })
  }
}
