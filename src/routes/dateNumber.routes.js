const router = require("express").Router();
const {
  addDateNumber,
  updateNumber,
  getAllDateNumbers,
} = require("../controllers/dateNumber.controller");

const cacheShort = (req, res, next) => {
  if (req.method === "GET") {
    res.set("Cache-Control", "public, max-age=10, stale-while-revalidate=5");
  }
  next();
};

/**
 * @swagger
 * tags:
 *   - name: DateNumber
 *     description: Date and Number Management
 */

/**
 * @swagger
 * /api/date-number:
 *   get:
 *     summary: Get all dates with numbers
 *     tags: [DateNumber]
 *     responses:
 *       200:
 *         description: List fetched successfully
 */
router.get("/", cacheShort, getAllDateNumbers);

/**
 * @swagger
 * /api/date-number:
 *   post:
 *     summary: Add date and number
 *     tags: [DateNumber]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - number
 *             properties:
 *               date:
 *                 type: string
 *               number:
 *                 type: number
 *     responses:
 *       201:
 *         description: Added successfully
 */
router.post("/", addDateNumber);

/**
 * @swagger
 * /api/date-number/{date}:
 *   put:
 *     summary: Update number by date
 *     tags: [DateNumber]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *             properties:
 *               number:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.put("/:date", updateNumber);

module.exports = router;
