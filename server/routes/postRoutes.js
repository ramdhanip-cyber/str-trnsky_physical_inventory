const express = require("express");
const router = express.Router();
const post = require("../controllers/postController");

// Route to register user
// router.post("/signup", post.signup);
// router.post("/login", post.login);
// router.post("/logout", post.logout);
router.post("/create", post.createUser);
router.post("/assign-role", post.assignRole);
router.delete("/:user_id", post.deleteUser);
router.post("/locations", post.addLocation);
router.post("/sub-locations", post.addSubLocation);
router.delete("/sub-locations/:sub_location_id", post.deleteSubLocation);
router.delete("/locations/:location_id", post.deleteLocation);
router.post("/assign-user", post.assignUserToSubLocation);

module.exports = router;