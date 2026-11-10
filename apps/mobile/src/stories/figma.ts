export function figmaParameters(id: string, width = 370, description = '') {
  return {
    referenceLayout: true,
    designWidth: width,
    docs: {
      description: {
        component: `[Maestro de Figma](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=${id.replace(':', '-')}). ${description}`,
      },
    },
  };
}
