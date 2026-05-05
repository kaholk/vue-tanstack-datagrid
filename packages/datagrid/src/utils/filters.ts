export function toFilterGroupId(label: string) {
  return label.trim().toLocaleLowerCase().replace(/\s+/g, '-')
}
