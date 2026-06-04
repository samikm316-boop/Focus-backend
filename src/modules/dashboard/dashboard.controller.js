const dashboardService = require("./dashboard.service");

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const dashboard = await dashboardService.getDashboard(userId);

    return res.status(200).json(dashboard);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to load dashboard",
    });
  }
};
