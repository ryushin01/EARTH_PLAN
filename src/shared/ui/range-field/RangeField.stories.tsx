import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RangeField } from './RangeField'

function Demo() {
  const [value, setValue] = useState(1.2)
  return (
    <RangeField
      label="해수면"
      value={value}
      min={0}
      max={80}
      step={0.1}
      onChange={setValue}
      valueText={`+${value.toFixed(1)} m`}
      description="2020년 대비 전 지구 평균 해수면"
    />
  )
}

const meta = { title: 'shared/RangeField', component: Demo } satisfies Meta<
  typeof Demo
>
export default meta
export const Default: StoryObj<typeof meta> = {}
