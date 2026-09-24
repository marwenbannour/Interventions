/** Miroir exact de PASSWORD_RULE côté backend (src/modules/users/dto/user.dto.ts). */
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;
export const PASSWORD_MESSAGE = 'Mot de passe : 10 caractères minimum, avec majuscule, minuscule et chiffre';
