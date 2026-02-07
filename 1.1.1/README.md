# File Manager - Local Web File Manager

### 0. 
TO USE, DOWNLOAD NODE JS


## Features
-  **File Operations** - Upload, download, rename, and delete files/folders
-  **Real-time Stats** - Display upload/download speeds and progress
-  **Network Access** - Access your files from any device on the same network
-  **Local Only** - Runs entirely on your local machine, no external servers

## Quick Start

### 1. Setup (First Time Only)
1. Double-click on `setup.bat` to install required dependencies
2. Wait for the installation to complete

### 2. Start the Server
1. Double-click on `start.bat` to launch the file manager
2. A console window will open showing the server status

### 3. Access the File Manager
After starting the server, you will see connection information in the console:
╔═══════════════════════════════════════════════════════════╗
║ File Manager is running                                   ║
╠═══════════════════════════════════════════════════════════╣
║ Local access: http://localhost:3000                       ║
║ Network access:http://[YOUR-IP-ADDRESS]:3000              ║
║ Uploads folder: C:\path\to\uploads                        ║
╚═══════════════════════════════════════════════════════════╝

**Important:** Note the IP address shown in the console (e.g., `192.168.1.100` in the example above). This is your connection IP address.

### 4. Connect to the File Manager

**From this computer:**
- Open your web browser
- Go to: `http://localhost:3000`

**From other devices on the same network:**
- Open a web browser on the other device
- Go to: `http://[YOUR-IP-ADDRESS]:3000`
  *(Replace `[YOUR-IP-ADDRESS]` with the IP shown in the console)*

## Files Included
- `index.html` - Main web interface
- `style.css` - Styling with theme support
- `script.js` - Client-side functionality
- `server.js` - Node.js server backend
- `package.json` - Dependencies and configuration
- `setup.bat` - Setup script for Windows
- `start.bat` - Launch script for Windows

## System Requirements
- **System:** For better conections connect server cable internet
- **Software:** Node.js https://nodejs.org
- **Network:** Local network access for multi-device connectivity

## How to Use
1. **Upload Files:** Click the "Upload" button or drag files to the browser
2. **Navigate:** Click on folder names to enter, use breadcrumbs to go back
3. **Download:** Click the download icon next to files/folders
4. **Manage Files:** Use rename/delete icons to manage your files
5. **Switch Theme:** Click the moon/sun icon in the top-right corner

## Security Notes
⚠️ **Important Security Information:**
- This application runs on your local network
- Anyone on the same network can access the files if they know the IP address
- For sensitive files, consider:
  - Using a firewall to block port 3000
  - Stopping the server when not in use
  - Using it only on trusted networks

## Troubleshooting

### Common Issues:

1. **"Port 3000 is already in use"**
   - Close any other applications using port 3000
   - Or modify `server.js` to use a different port

2. **Can't connect from other devices**
   - Ensure all devices are on the same network
   - Check Windows Firewall settings
   - Verify the IP address shown in the console

3. **Setup.bat fails**
   - Ensure you have internet connectivity
   - Try running as Administrator
   - Check if Node.js is already installed

## Stopping the Server
To stop the file manager:
1. Go to the console window
2. Press `Ctrl + C`
3. Confirm by pressing `Y` then `Enter`


## Support
For issues or questions:
1. Check the console for error messages
2. Ensure all prerequisites are installed
3. Verify network connectivity

**Note:** Always remember to stop the server when you're done using it to prevent unauthorized access to your files.