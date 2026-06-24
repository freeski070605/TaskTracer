import bcrypt from 'bcrypt';

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};
