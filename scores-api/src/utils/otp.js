const { randomInt } = require('crypto')

exports.generateOTP = () => String(randomInt(100000, 1000000))
