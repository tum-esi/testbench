try {
	const fs = require("fs");
	const del = require('del');
	try {
			if (fs.existsSync("package-lock.json")) {
				del('package-lock.json');
			}
			if (fs.existsSync("dist")) {
				del('dist');
			}
			if (fs.existsSync("Reports")) {
				del('Reports');
			}
			if (fs.existsSync("Resources")) {
				del('Resources');
			}
			if (fs.existsSync("node_modules")) {
				del('node_modules');
			}
			console.log('Successfully Cleaned');
	} catch (err) {
			console.log('Unable to clean');
	}
} catch (err) {
	console.log('node_modules folder not found');
}
