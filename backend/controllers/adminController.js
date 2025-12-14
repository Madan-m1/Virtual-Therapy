exports.adminDashboard = async (req, res) => {
  res.json({
    message: "Welcome Admin",
    admin: req.user.name,
  });
};
