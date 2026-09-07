/**
 * Contoh pemakaian di route: role('kabalai','kasubag')
 * Port dari app/Http/Middleware/CheckRole.php
 */
export function role(...roles) {
  return (req, res, next) => {
    const user = req.user;

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses untuk aksi ini.' });
    }

    next();
  };
}
