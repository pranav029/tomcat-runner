import { AbstractControl, ValidatorFn } from "@angular/forms";
import { Instance } from "../model/instance";

const MAX_PORT_VALUE = 9999
const MIN_PORT_VALUE = 8000
export class TomcatRunnerValidators {

    static validName(isInvalidName: (name: string) => boolean, instance: Instance): ValidatorFn {
        return (control: AbstractControl): { [key: string]: boolean } | null => {
            if (instance.isSaved)
                return null
            if (isInvalidName(control.value))
                return { inValidName: true }
            return null
        }
    }

    static validPort(control: AbstractControl): { [key: string]: boolean } | null {
        const port: number = parseInt(control.value)
        if (port > MAX_PORT_VALUE || port < MIN_PORT_VALUE)
            return { inValidPort: true }
        return null
    }
}