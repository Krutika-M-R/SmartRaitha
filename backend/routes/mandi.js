const express = require("express");
const router = express.Router();
const { fetchAgmarknetResponse } = require("../services/importService");

router.get("/", async (req, res) => {
  try {
    const { state, district, commodity } = req.query;

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 50, 1),
      100
    );
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const filters = {};
    if (state) filters["state.keyword"] = state;
    if (district) filters["district.keyword"] = district;
    if (commodity) filters["commodity.keyword"] = commodity;
    const data = await fetchAgmarknetResponse({ filters, limit, offset });

    res.json({
      total: data.total,
      count: data.count,
      records: data.records || [],
    });
  } catch (error) {
    console.error("Mandi API error:", error.message);
    res.status(500).json({
      message: error.message || "Error fetching mandi prices",
    });
  }
});

module.exports = router;