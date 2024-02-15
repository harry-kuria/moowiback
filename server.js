const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const util = require ('util');
const bwipjs = require('bwip-js');
const { PDFNet } = require('@pdftron/pdfnet-node');
const fs = require('fs');
const numberToWords = require('number-to-words');
var wrap = require('word-wrap');
const { PDFDocument, rgb, PDFFont,StandardFonts, TextAlignment } = require('pdf-lib');
const fontkit = require("@pdf-lib/fontkit");
const { createCanvas } = require('canvas');

//const PDFTronLicense = require('./LicenseKey/LicenseKey');

const app = express();
const port = 5000;
const bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '5000mb' }));
app.use(cors());
app.use(express.json());
app.use('/assetLogos',express.static('assetLogos'));


const storage = multer.diskStorage({
  destination: './assetLogos/', // Specify the directory where the file should be stored
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Define the filename
  }
});

const upload = multer({storage: storage });

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'H@rri50nmysql',
  database: 'asset_management',
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed: ', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

// Endpoint for user authentication
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // Check the provided credentials against the 'users' table
  db.query(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, userResult) => {
      if (err) {
        console.error('Error executing MySQL query: ', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        if (userResult.length > 0) {
          const userId = userResult[0].id;

          // Fetch user roles from the 'user_roles' table
          db.query(
            'SELECT * FROM user_roles WHERE user_id = ?',
            [userId],
            (err, rolesResult) => {
              if (err) {
                console.error('Error fetching user roles: ', err);
                res.status(500).json({ error: 'Internal Server Error' });
              } else {
                // Extract role names from the result
                const userRoles = {
                  userManagement: rolesResult[0].userManagement,
                  assetManagement: rolesResult[0].assetManagement,
                  encodeAssets: rolesResult[0].encodeAssets,
                  addMultipleAssets: rolesResult[0].addMultipleAssets,
                  viewReports: rolesResult[0].viewReports,
                  printReports: rolesResult[0].printReports,
                };

                // Valid credentials
                res.status(200).json({ success: true, roles: userRoles });
                console.log('Success. User roles:', userRoles);
              }
            }
          );
        } else {
          // Invalid credentials
          res.status(401).json({ success: false });
        }
      }
    }
  );
});


const replaceText = async (totals) => {
  const pdfDoc = await PDFNet.PDFDoc.createFromFilePath(inputPath);
  await pdfDoc.initSecurityHandler();
  const replacer = await PDFNet.ContentReplacer.create();

  // Get the page 1
  const page = await pdfDoc.getPage(1);

  // Replace placeholders with asset types and their totals
  for (const assetType in totals.assetTypes) {
    if (totals.assetTypes.hasOwnProperty(assetType)) {
      await replacer.addString(`${assetType}Value`, totals.assetTypes[assetType].totalMarketValue);
    }
  }

  // Replace the grand total placeholder
  await replacer.addString('GrandTotalValue', totals.grandTotal.toString());

  // Process the replacements
  await replacer.process(page);

  // Save the modified PDF
  pdfDoc.save(ouputPath, PDFNet.SDFDoc.SaveOptions.e_linearized);
};


function getTextWidth(text, fontSize, font) {
  const canvas = createCanvas(1000, 1000); // Create a virtual canvas
  const context = canvas.getContext('2d');
  context.font = `${fontSize}px ${font}`; // Set the font for the context
  const width = context.measureText(text).width; // Measure the width of the text
  return width;
}

// Draw the right-aligned text
function drawTextRightAligned(page, text, x, y, maxWidth, font, fontSize) {
  const textWidth = getTextWidth(text, font, fontSize); // Calculate the width of the text
  const adjustedX = x - Math.min(textWidth, maxWidth); // Calculate the adjusted x-coordinate to fit the text within the required margin
  page.drawText(text, {
      x: adjustedX,
      y: y,
      size: fontSize,
      font: font,
      wordBreaks: [" "],
      color: rgb(0, 0, 0),
  });
}

app.post('/api/generate_invoice', (req, res) => {
  const { landTotal, buildingTotal,biologicalAssetsTotal, intangibleAssetsTotal, furnitureTotal,computerTotal,mvTotal,equipmentTotal,grandTotal,totalLandAndBuildings,institution,fCEBIM } = req.body;
  const inputPath = path.resolve(__dirname, './files/Moowi_Certificate.pdf');
  const outputPath = path.resolve(__dirname, './files/Moowi_Valuation_Certificate.pdf');
  const fontPath = path.resolve(__dirname, './files/times_new_roman.ttf');
  //const totalLandAndBuildings = landTotal + buildingTotal;
  let date_ob = new Date();

// current date
// adjust 0 before single digit date
let date = ("0" + date_ob.getDate()).slice(-2);

// current month
let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

// current year
let year = date_ob.getFullYear();



// prints date in YYYY-MM-DD format
console.log(year + "-" + month + "-" + date);

// prints date & time in YYYY-MM-DD HH:MM:SS format
console.log(date + "/" + month + "/" + year);
const finalDate = date + "/" + month + "/" + year;

  const replaceText = async () => {
    try {
      
      const existingPdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const timesroman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesroman_bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const pages = pdfDoc.getPages()
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      const fCEBIMWords1 = numberToWords.toWords(fCEBIM).toUpperCase();
      
      
      drawTextRightAligned(firstPage, furnitureTotal.toLocaleString(),545, 455,100,timesroman,12);
      drawTextRightAligned(firstPage, computerTotal.toLocaleString(),545, 435,100,timesroman,12);
      drawTextRightAligned(firstPage, equipmentTotal.toLocaleString(),545, 420,100,timesroman,12);
      drawTextRightAligned(firstPage, mvTotal.toLocaleString(),545, 400,100,timesroman,12);
      drawTextRightAligned(firstPage, biologicalAssetsTotal.toLocaleString(),545, 385,100,timesroman,12);
      drawTextRightAligned(firstPage, intangibleAssetsTotal.toLocaleString(),545, 365,100,timesroman,12);
      drawTextRightAligned(firstPage, grandTotal.toLocaleString(),545, 345,100,timesroman_bold,12);
      const totalLandAndBuildingsWords = numberToWords.toWords(totalLandAndBuildings).toUpperCase();
      

      firstPage.drawText(finalDate, {
        x: 163,
        y: 230,
        size: 12,
        font:timesroman_bold,
        maxWidth: 500, wordBreaks: [" "],
        color: rgb(0, 0, 0), 
        TextAlignment: TextAlignment.Right,
      })
      firstPage.drawText('On the basis of the foregoing particulars, our terms of reference and relevant factors, it is our considered opinion that the Current Market Values of the Moveable and Immoveable assets(Motor Vehicle, Biological Assets, Intangible Assets, Computers, Furniture and Fittings and Equipment and Machinery within '+institution+', free from any encumbrances whatsoever.', {
        x: 70,
        y: 586,
        size: 12,
        font:timesroman,
        maxWidth: 500, wordBreaks: [" "],
        color: rgb(0, 0, 0), 
        TextAlignment: TextAlignment.Right,
        lineHeight: 13
        
      })
      const grandTotalWords = numberToWords.toWords(grandTotal).toUpperCase();
    
      firstPage.drawText('Market Value: '+grandTotalWords , {
        x: 70,
        y: 516,
        size: 12,
        font:timesroman_bold,
        maxWidth: 500, wordBreaks: [" "],
        color: rgb(0, 0, 0), 
        TextAlignment: TextAlignment.Right,
        lineHeight: 13
        
      })
      firstPage.drawText(finalDate, {
        x: 485,
        y: 630,
        size: 12,
        font:timesroman_bold,
        maxWidth: 500, wordBreaks: [" "],
        color: rgb(0, 0, 0), 
        TextAlignment: TextAlignment.Right,
      })
      
      
  

  const modifiedPdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, modifiedPdfBytes);
  console.log('Output path:', outputPath);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="Moowi_Valuation_Certificate.pdf"');
  res.sendFile(outputPath);
   
  } catch (error) {
    console.error('Error in replaceText function:', error);
    throw error; // Re-throw the error to propagate it further if needed
  }
  };
  replaceText();

  
});

app.get('/api/download', (req, res) => {
  console.log('Download endpoint reached');
  const filePath = path.join(__dirname, './files/', 'Moowi_Valuation_Certificate.pdf');
  res.download(filePath, 'Moowi_Valuation_Certificate.pdf'); // Downloads the file
});




// Update the user creation endpoint to accept only username and password
app.post('/api/addUser', (req, res) => {
  const { username, password, roles } = req.body;

  // Validate input (e.g., check if required fields are present)
  if (!username || !password || !roles) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  // Insert the new user into the database
  // Assuming you have a 'users' and 'user_roles' table in your database
  const userQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.query(userQuery, [username, password], (userErr, userResult) => {
    if (userErr) {
      console.error('Error adding user:', userErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const userId = userResult.insertId;

    // Insert the roles for the user into the 'user_roles' table
    const rolesQuery = 'INSERT INTO user_roles (user_id, userManagement, assetManagement, encodeAssets, addMultipleAssets, viewReports, printReports) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(
      rolesQuery,
      [userId, roles.includes('userManagement'), roles.includes('assetManagement'), roles.includes('encodeAssets'), roles.includes('addMultipleAssets'), roles.includes('viewReports'), roles.includes('printReports')],
      (rolesErr) => {
        if (rolesErr) {
          console.error('Error adding user roles:', rolesErr);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        res.status(201).json({ message: 'User added successfully', userId });
      }
    );
  });
});

// Get all users
app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json(results);
    }
  });
});

// Get a single user by ID
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) {
      console.error('Error fetching user details:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      const user = result[0];
      res.status(200).json(user);
    }
  });
});

// Update a user by ID
app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const { username, password } = req.body;
  db.query(
    'UPDATE users SET username = ?, password = ? WHERE id = ?',
    [username, password, userId],
    (err, result) => {
      if (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.status(200).json({ success: true });
      }
    }
  );
});

// Delete a user by ID
app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) {
      console.error('Error deleting user:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ success: true });
    }
  });
});

// Add this route to fetch all assets
app.get('/api/assets', (req, res) => {
  // Fetch all assets from the database
  const query = 'SELECT * FROM assets';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching assets:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json(results);
    }
  });
});

// Add this route to fetch all institutions
app.get('/api/institutions', (req, res) => {
  const query = 'SELECT DISTINCT institutionName FROM assets WHERE institutionName IS NOT NULL';

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching institutions:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // Extract the actual result data from the MySQL query response
    const institutionsResult = results.map(result => result.institutionName);
   
    res.status(200).json(institutionsResult);
  });
});

app.get('/api/departments', (req, res) => {
  const query = 'SELECT DISTINCT department FROM assets WHERE department IS NOT NULL';

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching departments:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const departmentsResult = results.map(result => result.department);
    res.status(200).json(departmentsResult);
  });
});

// Add this route to fetch all functional areas
app.get('/api/functionalAreas', (req, res) => {
  const query = 'SELECT DISTINCT functionalArea FROM assets WHERE functionalArea IS NOT NULL';

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching functional areas:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const functionalAreasResult = results.map(result => result.functionalArea);
    res.status(200).json(functionalAreasResult);
  });
});

app.post('/api/addMultipleAssets/:assetType', (req, res) => {
  const importedAssets = req.body;
  const assetType = req.params.assetType;
  
  //console.log('Received data on the server:', req.body);
    console.log('Received asset type on the server:',assetType);


  try {
    // Validate asset type (optional)
    // Add additional validation logic as needed
    console.log('Received asset type for validation:', assetType);
const allowedAssetTypes = ['computer', 'electronics','equipment','biologicalassets','furniture', 'motorvehicle', 'building', 'land','intangibleassets'];
const trimmedAssetType = assetType.trim().toLowerCase(); // Trim and convert to lowercase
console.log('Trimmed and lowercase asset type:', trimmedAssetType);

if (!allowedAssetTypes.includes(trimmedAssetType)) {
  console.log('Validation failed. Invalid asset type:', trimmedAssetType);
  return res.status(400).json({ error: 'Invalid asset type' });
} else {
  console.log('Validation successful. Asset type:', trimmedAssetType);
}

    // Define a mapping of asset types to tables and columns
    const assetTypeMappings = {
      computer: { table: 'assets', columns: ['assetName', 'assetType','serialNumber','description','purchasePrice','marketValue','manufacturer','modelNumber','location','status','barcode','institutionName','department','functionalArea','logo','vehicleregno','sourceoffunds','enginenumber','chassisnumber','make','purchaseyear','pvnumber','originallocation','currentlocation','replacementdate','amount','depreciationrate','annualdepreciation','accumulateddepreciation','netbookvalue','disposaldate','responsibleofficer','assetcondition' ] },
      equipment: { table: 'assets', columns: ['assetName', 'assetType','serialNumber','description','purchasePrice','marketValue','manufacturer','modelNumber','location','status','barcode','institutionName','department','functionalArea','logo','vehicleregno','sourceoffunds','enginenumber','chassisnumber','make','purchaseyear','pvnumber','originallocation','currentlocation','replacementdate','amount','depreciationrate','annualdepreciation','accumulateddepreciation','netbookvalue','disposaldate','responsibleofficer','assetcondition' ] },
      electronics: { table: 'assets', columns: ['assetName', 'assetType','serialNumber','description','purchasePrice','marketValue','manufacturer','modelNumber','location','status','barcode','institutionName','department','functionalArea','logo','vehicleregno','sourceoffunds','enginenumber','chassisnumber','make','purchaseyear','pvnumber','originallocation','currentlocation','replacementdate','amount','depreciationrate','annualdepreciation','accumulateddepreciation','netbookvalue','disposaldate','responsibleofficer','assetcondition'] },
      furniture: { table: 'assets', columns: ['assetName', 'assetType','serialNumber','description','purchasePrice','marketValue','manufacturer','modelNumber','location','status','barcode','institutionName','department','functionalArea','logo','vehicleregno','sourceoffunds','enginenumber','chassisnumber','make','purchaseyear','pvnumber','originallocation','currentlocation','replacementdate','amount','depreciationrate','annualdepreciation','accumulateddepreciation','netbookvalue','disposaldate','responsibleofficer','assetcondition'] },
      motorvehicle: { table: 'assets', columns: ['assetName', 'assetType','serialNumber','description','purchasePrice','marketValue','manufacturer','modelNumber','location','status','barcode','institutionName','department','functionalArea','logo','vehicleregno','sourceoffunds','enginenumber','chassisnumber','make','purchaseyear','pvnumber','originallocation','currentlocation','replacementdate','amount','depreciationrate','annualdepreciation','accumulateddepreciation','netbookvalue','disposaldate','responsibleofficer','assetcondition' ] },
      motorcycle: { table: 'assets', columns: ['assetName', 'assetType','serialNumber','description','purchasePrice','marketValue','manufacturer','modelNumber','location','status','barcode','institutionName','department','functionalArea','logo','vehicleregno','sourceoffunds','enginenumber','chassisnumber','make','purchaseyear','pvnumber','originallocation','currentlocation','replacementdate','amount','depreciationrate','annualdepreciation','accumulateddepreciation','netbookvalue','disposaldate','responsibleofficer','assetcondition' ] },
      building: { table: 'buildings', columns: ['assetName', 'assetType', 'description', 'ownership', 'institutionno', 'nearesttown', 'street', 'county', 'lrno', 'sizeofland', 'ownershipstatus', 'sourceoffunds', 'modeofacquisition', 'buildingtype', 'designateduse', 'nooffloors', 'area', 'valuation', 'annualdepreciation', 'estimatedusefullife', 'accumulateddepreciationrate', 'netbookvalue', 'annualrentalincome','institutionName'] },
      intangibleassets: { table: 'intangibleassets', columns: ['assetName','institutionName','description','unitprice','currentValue','assetType','marketValue'] },
      biologicalassets: { table: 'biologicalassets', columns: ['assetName','assetType','institutionName','description','serialNumber','status','unitValue', 'location','tag','marketValue'] },
      // other: { table: 'other_table', columns: ['column1', 'column2', /*...*/] },
      // Add more mappings as needed
    };

    // Get the mapping for the specified asset type
    const mapping = assetTypeMappings[trimmedAssetType.toLowerCase()];
  

    if (!mapping) {
      return res.status(400).json({ error: 'Invalid asset type' });
    }

    // Insert the imported assets into the appropriate table
    const query = `INSERT INTO ${mapping.table} (${mapping.columns.join(', ')}) VALUES (${Array(mapping.columns.length).fill('?').join(', ')})`;
console.log('Mapping for the specified asset type:', mapping);
console.log('Query', query);
    for (const asset of importedAssets) {
      // Extract values based on the mapping
      const values = mapping.columns.map((column) => asset[column]);

      // Add the new field to your SQL query
      db.query(
        query,
        values,
        (err, result) => {
          if (err) {
            console.error('Error inserting asset into the database:', err);
            // Handle the error as needed
          } else {
            console.log('Asset added successfully:', result);
            // You can log or handle the success as needed
          }
        }
      );
    }

    res.status(200).json({ success: true, message: `Multiple ${mapping.table} assets added successfully` });
  } catch (error) {
    console.error('Error handling multiple asset import:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Edit an asset
app.put('/api/assets/:id', (req, res) => {
  const assetId = req.params.id;
  const updatedAssetData = req.body;  // Assuming updated asset data is sent in the request body

  // Update the asset in the database
  const query = 'UPDATE assets SET ? WHERE id = ?';

  db.query(query, [updatedAssetData, assetId], (err, result) => {
    if (err) {
      console.error('Error updating asset:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ success: true });
    }
  });
});



// Delete an asset
app.delete('/api/assets/:id', (req, res) => {
  const assetId = req.params.id;

  // Delete the asset from the database
  const query = 'DELETE FROM assets WHERE id = ?';

  db.query(query, [assetId], (err, result) => {
    if (err) {
      console.error('Error deleting asset:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ success: true });
    }
  });
});


app.get('/api/categories', (req, res) => {
  db.query('SELECT * FROM asset_categories', (err, result) => {
    if (err) {
      console.error('Error executing MySQL query: ', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json(result);
    }
  });
});
app.get('/api/manufacturers', (req, res) => {
  const query = 'SELECT DISTINCT manufacturer FROM assets WHERE manufacturer IS NOT NULL';

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching manufacturers:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // Extract the actual result data from the MySQL query response
    const manufacturersResult = results.map(result => result.manufacturer);
   

    res.status(200).json(manufacturersResult);
  });
});



app.post('/api/addAsset', upload.single('logo'), (req, res) => {
  const {
    assetName,
    assetType,
    serialNumber,
    description,
    
    purchasePrice,
    marketValue,
    manufacturer,
    modelNumber,
    location,
    institutionName,
    department,
    functionalArea,
  } = req.body;

  const logo = req.file ? req.file.filename : null; 
  const logoUrl = logo ? `http://localhost:5000/assetLogos/${logo}` : null;
  const dateObject = new Date(purchaseDate);
  const formattedDate = dateObject.toISOString().slice(0, 19).replace('T', ' ');

  // Add the new field to your SQL query
  db.query(
    'INSERT INTO assets (assetName, assetType, serialNumber, description, purchasePrice, marketValue, manufacturer, modelNumber, location, institutionName, department, functionalArea, logo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      assetName,
      assetType,
      serialNumber,
      description,
      
      purchasePrice,
      marketValue,
      manufacturer,
      modelNumber,
      location,
      institutionName,
      department,
      functionalArea,
      logoUrl,
    ],
    (err, result) => {
      if (err) {
        console.error('Error inserting asset into the database:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.status(200).json({ success: true });
      }
    }
  );
});


app.get('/api/searchAssets', (req, res) => {
  const searchTerm = req.query.term;

  // Query your database to find assets that match the searchTerm
  db.query(
    'SELECT * FROM assets WHERE assetName LIKE ?',
    [`%${searchTerm}%`],  // Use the LIKE operator to find partial matches
    (err, results) => {
      if (err) {
        console.error('Error searching assets:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.status(200).json(results);
      }
    }
  );
});

app.get('/api/getAssetDetails', (req, res) => {
  const assetId = req.query.id;

  // Query the database to get detailed information for the specified asset ID
  db.query('SELECT * FROM assets WHERE id = ?', [assetId], (err, result) => {
    if (err) {
      console.error('Error fetching asset details:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      // Assuming there is a single result, you might want to handle multiple results differently
      const assetDetails = result[0];
      res.status(200).json(assetDetails);
    }
  });
});

// Express route to generate Excel report
app.post('/api/generateAssetReport', (req, res) => {
  const { assetType, location, startDate, endDate } = req.body;

  // Your logic to fetch data from the database based on filters
  // Example: const filteredData = fetchDataFromDatabase(assetType, location, startDate, endDate);

  // Create Excel workbook and worksheet
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Asset Register');

  // Add headers to the worksheet
  worksheet.addRow(['Asset Name', 'Asset Type', 'Location', 'Purchase Date']);

  // Add data to the worksheet (example data)
  filteredData.forEach((asset) => {
    worksheet.addRow([asset.assetName, asset.assetType, asset.location, asset.purchaseDate]);
  });

  // Set content type and send the Excel file
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=asset_register.xlsx');

  return workbook.xlsx.write(res)
    .then(() => {
      res.end();
    })
    .catch((err) => {
      console.error('Error generating Excel report:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

app.post('/api/generateBarcodes', async (req, res) => {
  const { assetIds } = req.body;

  try {
    const barcodeTags = [];

    for (const assetId of assetIds) {
      const assetDetails = await getAssetDetails(assetId);
      const barcodeData = generateBarcodeData(assetDetails);
      const barcodeTag = await generateBarcodeTag(barcodeData);
      barcodeTags.push({ assetId, barcodeTag });
    }

    res.status(200).json({ success: true, barcodeTags });
  } catch (error) {
    console.error('Error generating barcodes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Helper function to fetch asset details by ID
const getAssetDetails = (assetId) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM assets WHERE id = ?', [assetId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
};

const generateBarcodeData = (assetDetails) => {
  const institutionShort = getShortName(assetDetails.institutionName);
  const departmentShort = getShortName(assetDetails.department);
  const functionalAreaShort = getShortName(assetDetails.functionalArea);
  
  // Add a null check for assetDetails.assetName
  const assetNameShort = assetDetails.assetName ? getShortName(assetDetails.assetName.replace(/\s/g, '')) : '';
  
  const id = assetDetails.id;

  return `${institutionShort}/${departmentShort}/${functionalAreaShort}/${assetNameShort}/${id}`;
};


const getShortName = (fullText) => {
  // Check if fullText is null or undefined
  if (fullText == null) {
    // Return some default value or handle the null case as required
    return '';
  }
  // Otherwise, proceed with getting the short name
  return fullText.substring(0, 2).toUpperCase();
};

// Helper function to generate barcode tag as an image
const generateBarcodeTag = async (barcodeData) => {
  return new Promise((resolve, reject) => {
    // Generate barcode using bwip-js
    bwipjs.toBuffer(
      {
        bcid: 'code128', // Use the barcode type you need
        text: barcodeData,
        width: 150, // Adjust as needed
        height: 30, // Set a fixed height
      },
      (err, png) => {
        if (err) {
          console.error('Error generating barcode:', err);
          reject(err);
        } else {
          // Convert the buffer to a base64 data URL
          const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
          resolve(dataUrl);
        }
      }
    );
  });
};



const generateFormattedString = (asset) => {
  const institutionShort = getInstitutionInitials(asset.institutionName).toUpperCase();
  
  // Add null or undefined checks for asset.department and asset.functionalArea
  const departmentShort = (asset.department && typeof asset.department === 'string') ? asset.department.substring(0, 2).toUpperCase() : '';
  const functionalAreaShort = (asset.functionalArea && typeof asset.functionalArea === 'string') ? asset.functionalArea.substring(0, 2).toUpperCase() : '';
  
  const assetNameShort = getShortForm(asset.assetName).toUpperCase();
  const id = asset.id;

  return `${institutionShort}/${departmentShort}/${functionalAreaShort}/${assetNameShort}/${id}`;
};


const getShortForm = (assetName) => {
  // Add null or undefined check for assetName
  if (!assetName) {
    return '';
  }

  // Split the asset name into words
  const words = assetName.split(' ');

  if (words.length >= 2) {
    // If there are two or more words, take the first letter from each word
    return words.map((word) => word[0]).join('');
  } else if (words.length === 1) {
    // If there is only one word, take the first and last letter
    return `${words[0][0]}${words[0][words[0].length - 1]}`;
  } else {
    // Handle the case where there are no words (empty string or only spaces)
    return '';
  }
};


const getInstitutionInitials = (institutionName) => {
  // Logic to extract initials from institution name
  // For example, if institutionName is "Kenyatta University", this should return "KU"
  const words = institutionName.split(' ');
  const initials = words.map((word) => word[0]).join('');
  return initials;
};

// Add this route to generate barcodes for a specific institution
app.post('/api/generateBarcodesByInstitution', async (req, res) => {
  const { institution } = req.body;

  try {
    // Fetch assets associated with the selected institution
    const assets = await getAssetsByInstitution(institution);

    // Generate barcodes and tags for each asset
    const barcodeTags = [];

for (const asset of assets) {
  const barcodeData = generateBarcodeData(asset);
  const formattedString = generateFormattedString(asset);
  const barcodeTag = await generateBarcodeTag(barcodeData);

  // Fetch additional asset details
  const assetDetails = await getAssetDetails(asset.id);

  // Include assetDetails in the response
  barcodeTags.push({ assetId: asset.id, barcodeTag, formattedString, assetDetails });
}

res.status(200).json({ success: true, barcodeTags });

  } catch (error) {
    console.error('Error generating barcodes by institution:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
const getLandsByInstitution = (institution) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM lands WHERE institutionName = ?', [institution], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

const getBiologicalAssetsByInstitution = (institution) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM biologicalassets WHERE institutionName = ?', [institution], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};
const getIntangibleAssetsByInstitution = (institution) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM intangibleassets WHERE institutionName = ?', [institution], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};
const getBuildingsByInstitution = (institution) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM buildings WHERE institutionName = ?', [institution], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

const getAssetsByInstitution = (institution) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM assets WHERE institutionName = ?', [institution], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

app.post('/api/fetchAssetsByInstitution', async (req, res) => {
  const { institutionName } = req.body;

  try {
    // Fetch assets associated with the selected institution
    const assets = await getAssetsByInstitution(institutionName);
    const equipment = await getAssetsByInstitution(institutionName);



//     // Fetch assets associated with the selected institution from the 'lands' table
    const lands = await getLandsByInstitution(institutionName);

    // Fetch assets associated with the selected institution from the 'buildings' table
    const buildings = await getBuildingsByInstitution(institutionName);
    const biologicalAssets = await getBiologicalAssetsByInstitution(institutionName);
    const intangibleAssets = await getIntangibleAssetsByInstitution(institutionName);
    // Combine the results from different tables as needed
    const allAssets = [...assets, ...lands, ...buildings,...equipment, ...biologicalAssets, ...intangibleAssets];
    // Separate assets into two arrays: one that needs barcodes and one that doesn't
    const assetsNeedingCodes = [];
    const assetsWithoutCodes = [];

    for (const asset of allAssets) {
      
      if (asset.assetType === 'MOTORVEHICLE' || asset.assetType === 'MOTORCYCLE' || asset.assetType === 'LAND' || asset.assetType === 'BUILDING') {
        // For the asset class that doesn't need barcodes, you can set a specific condition
        // In this example, I'm checking if the asset type is 'TypeWithoutBarcode'
        assetsWithoutCodes.push(asset);
      } 
      
      else {
        // For other asset classes that need barcodes, add them to the array
        assetsNeedingCodes.push(asset);
      }
    }

    // Generate barcodes and tags for assets that need codes
    const barcodeTags = await generateBarcodesForAssets(assetsNeedingCodes);

    // Add assets without codes to the response without generating barcodes
    const responseAssets = barcodeTags.concat(assetsWithoutCodes);

    res.status(200).json({ success: true, assets: responseAssets });
  } catch (error) {
    console.error('Error fetching assets and generating barcodes by institution:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// app.post('/api/fetchAssetsByInstitution', async (req, res) => {
//   const { institutionName } = req.body;

//   try {
//     // Fetch assets associated with the selected institution
//     const assetsFromAssetsTable = await getAssetsByInstitution(institutionName);

//     // Fetch assets associated with the selected institution from the 'lands' table
//     const lands = await getLandsByInstitution(institutionName);

//     // Fetch assets associated with the selected institution from the 'buildings' table
//     const buildings = await getBuildingsByInstitution(institutionName);

//     // Combine the results from different tables as needed
//     const allAssets = [...assetsFromAssetsTable, ...lands, ...buildings];

//     // Separate assets into two arrays: one that needs barcodes and one that doesn't
//     const assetsNeedingCodes = [];
//     const assetsWithoutCodes = [];

//     for (const asset of allAssets) {
//       if (asset.assetType === 'MOTOR VEHICLE' || asset.assetType === 'MOTOR CYCLE' || asset.assetType === 'LAND' || asset.assetType === 'BUILDING') {
//         // For the asset class that doesn't need barcodes, you can set a specific condition
//         // In this example, I'm checking if the asset type is 'TypeWithoutBarcode'
//         assetsWithoutCodes.push(asset);
//       } else {
//         // For other asset classes that need barcodes, add them to the array
//         assetsNeedingCodes.push(asset);
//       }
//     }

//     // Generate barcodes and tags for assets that need codes
//     const barcodeTags = await generateBarcodesForAssets(assetsNeedingCodes);

//     // Add assets without codes to the response without generating barcodes
//     const responseAssets = barcodeTags.concat(assetsWithoutCodes);

//     res.status(200).json({ success: true, assets: responseAssets });
//   } catch (error) {
//     console.error('Error fetching assets and generating barcodes by institution:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
const generateBarcodesForAssets = async (assets) => {
  const barcodeTags = [];

  for (const asset of assets) {
    const barcodeData = generateBarcodeData(asset);
    const formattedString = generateFormattedString(asset);
    const barcodeTag = await generateBarcodeTag(barcodeData);

    // Fetch additional asset details
    const assetDetails = await getAssetDetails(asset.id);

    // Include assetDetails in the response
    barcodeTags.push({ ...asset, barcodeTag, formattedString, assetDetails });
  }

  return barcodeTags;
};
const getAssetsByInstitutionAndDepartment = (institution, department) => {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM assets WHERE 1';

    const queryParams = [];

    if (institution && institution !== 'All') {
      query += ' AND institutionName = ?';
      queryParams.push(institution);
    }

    if (department && department !== 'All') {
      query += ' AND department = ?';
      queryParams.push(department);
    }

    db.query(query, queryParams, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};


// Add this route to generate barcodes for a specific institution and department
app.post('/api/generateBarcodesByInstitutionAndDepartment', async (req, res) => {
  const { institution, department } = req.body;

  try {
    // Fetch assets associated with the selected institution and department
    const assets = await getAssetsByInstitutionAndDepartment(institution, department);
    const filteredAssets = assets.filter(asset => {
      // Add more asset types as needed
      return ['computer', 'electronics', 'furniture','equipment'].includes(asset.assetType.toLowerCase());
    });
    // Generate barcodes and tags for each asset
    const barcodeTags = [];

    for (const asset of filteredAssets) {
      const barcodeData = generateBarcodeData(asset);
      const formattedString = generateFormattedString(asset);
      const barcodeTag = await generateBarcodeTag(barcodeData);

      // Fetch additional asset details
      const assetDetails = await getAssetDetails(asset.id);

      // Include assetDetails in the response
      barcodeTags.push({ assetId: asset.id, barcodeTag, formattedString, assetDetails });
    }

    res.status(200).json({ success: true, barcodeTags });
  } catch (error) {
    console.error('Error generating barcodes by institution and department:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// const getAssetsByInstitutionAndDepartment = (institution, department) => {
//   return new Promise((resolve, reject) => {
//     const query = 'SELECT * FROM assets WHERE institutionName = ? AND department = ?';
//     db.query(query, [institution, department], (err, results) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(results);
//       }
//     });
//   });
// };


app.get('/api/generateReport', async (req, res) => {
  const {
    assetType,
    location,
    status,
    startDate,
    endDate,
    manufacturer,
    modelNumber,
    institutionName,
    department,
    functionalArea,
  } = req.query;

  // Build your SQL query dynamically based on the provided filters
  const queryParams = [];
  let query = 'SELECT * FROM assets WHERE 1';

  if (assetType && assetType !== 'All') {
    query += ' AND assetType = ?';
    queryParams.push(assetType);
  }

  if (manufacturer && manufacturer !== 'All') {
    const manufacturerArray = Array.isArray(manufacturer) ? manufacturer : [manufacturer];
    query += ` AND manufacturer IN (?)`;
    queryParams.push(manufacturerArray);
  }

  // Add more conditions for other filters

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('Error fetching assets for report:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('Report data from the server:', results);
      res.status(200).json(results);
    }
  });
});




app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});