const jwt = require('jsonwebtoken');

const { JWT_KEY, NODE_ENV } = process.env;

const createToken = (user, expiresIn = '2d') => {
  const jwtPayload = { sub: user.id };
  const jwtOptions = { expiresIn };
  return jwt.sign(jwtPayload, JWT_KEY, jwtOptions);
};

const configCookie = maxAge => ({
  httpOnly: true,
  secure: NODE_ENV === 'production',
  maxAge,
});

const sendTokenCookie = (user, res) => {
  const token = createToken(user);
  const twoDaysMs = 1000 * 60 * 60 * 24 * 2;
  res.cookie('token', token, configCookie(twoDaysMs));
};

const clearTokenCookie = (res) => {
  res.clearCookie('token', configCookie(0));
};

const getTokenId = (token) => {
  try {
    const { sub } = jwt.verify(token, JWT_KEY);
    return sub;
  } catch (e) {
    return { error: e };
  }
};

const validateJWT = (token, id) => {
  const tokenId = getTokenId(token);
  if (tokenId.error) return tokenId;
  return tokenId === id;
};

module.exports = {
  createToken, sendTokenCookie, clearTokenCookie, validateJWT, getTokenId,
};
