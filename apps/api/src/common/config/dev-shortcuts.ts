/**
 * The verification token and link must reach a person only through their mailbox. Returning them in an API
 * response is a development shortcut (the development mailbox is not a real inbox), so it is closed unless
 * explicitly opened. It deliberately does not depend on NODE_ENV: an unset or unusual value must not open it.
 */
export const exponerAtajoDeVerificacion = (): boolean => process.env.EXPOSE_VERIFICATION_LINK === 'true';
