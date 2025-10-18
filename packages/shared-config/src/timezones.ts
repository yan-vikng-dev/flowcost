export const isValidTimeZone = (timezone: string): boolean => {
    try {
        new Intl.DateTimeFormat(undefined, { timeZone: timezone })
        return true
    } catch {
        return false
    }
}