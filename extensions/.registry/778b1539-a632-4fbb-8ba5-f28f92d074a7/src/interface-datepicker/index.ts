import { defineInterface } from '@directus/extensions-sdk'
import InterfaceComponent from './interface.vue'

export default defineInterface({
  id: '@altipla/datepicker',
  name: 'Fecha/Hora en español',
  icon: 'today',
  description: 'Fechas y horas empezando la semana en lunes.',
  component: InterfaceComponent,
  options: null,
  types: ['date', 'dateTime'],
})
