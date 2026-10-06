const BAR_INDENT = /^ {2}/gm

export const withoutBarIndent = (text: string) => text.replace(BAR_INDENT, '')
