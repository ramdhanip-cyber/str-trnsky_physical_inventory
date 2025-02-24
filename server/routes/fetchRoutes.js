const express = require("express");
const router = express.Router();
const fetch = require("../controllers/fetchController");
const {authMiddleware} = require("../middleware/authMiddleware");

// Route to get roles
router.get("/roles", fetch.getRoles);
router.get("/profile", fetch.getSession);
router.get("/users", fetch.getUsers);
router.get("/locations", fetch.fetchLocations);
router.get("/:location_id/sub-locations", fetch.fetchSubLocations);
router.get("/items", authMiddleware, fetch.fetchItems);

module.exports = router;