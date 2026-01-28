# Troubleshooting - Flash Loan AMM

## Problem: Signature Request Keeps Loading Forever

If you click to sign and the button keeps loading indefinitely, follow these steps:

### 1. **Check MetaMask Popup**
   - MetaMask opens a **popup** for you to sign
   - The popup might be:
     - Blocked by the browser
     - Hidden behind another window
     - Minimized in the taskbar
   
   **Solution:**
   - Look for minimized MetaMask windows
   - Click on the MetaMask extension icon in your browser
   - Allow popups from the site (localhost) in your browser settings

### 2. **MetaMask Already Has a Pending Request**
   - If you clicked multiple times, there may be multiple pending requests
   
   **Solution:**
   - Open MetaMask
   - Reject ALL pending requests
   - Close and reopen MetaMask
   - Try signing again

### 3. **Signature Timeout**
   - The system now has a 60-second timeout
   - If 60 seconds pass, you will see an error message
   
   **Error messages you may see:**
   - `Signature request rejected by user` - You rejected in MetaMask
   - `Signature request timed out` - 60 seconds passed without response
   - `MetaMask already has a pending request` - Another request is already open

### 4. **Reload the Page**
   - If nothing works, reload the page (F5)
   - Reconnect your wallet
   - Try again

### 5. **Check Browser Console**
   - Press `F12` to open DevTools
   - Go to the "Console" tab
   - Look for error messages
   - You should see: `Please check MetaMask to sign the message...`

### 6. **Common Problems**

#### MetaMask is frozen
```
Solution: Close the browser completely and reopen it
```

#### Wrong network selected
```
Solution: Make sure you are on the "Localhost 8545" network
```

#### Account locked
```
Solution: Open MetaMask and unlock it with your password
```

### 7. **Quick Checklist**

Before attempting to sign:
- [ ] MetaMask is installed and unlocked
- [ ] Connected to the correct network (Localhost 8545)
- [ ] No pending requests in MetaMask
- [ ] Popups allowed in browser
- [ ] Browser console open to see messages

### 8. **How Signature Works**

1. You fill in the amount and click "Generate Signature"
2. The frontend calls `signer.signMessage()`
3. **MetaMask opens a popup requesting your signature**
4. You click "Sign" in the MetaMask popup
5. The signature is generated and displayed on screen
6. Now you can execute the flash loan

### 9. **Visual Cues**

When you click to sign:
- The button will show a pulsing animation (bright blue)
- A message appears: "Check MetaMask to sign the message..."
- You have 60 seconds to sign before timeout

### 10. **Still Not Working?**

If after following all steps it still doesn't work:

1. Check if the Hardhat node is running:
   ```bash
   npx hardhat node
   ```

2. Check if contracts were deployed:
   ```bash
   npx hardhat run scripts/full-setup.js --network localhost
   ```

3. Try with a different MetaMask account

4. Clear browser and MetaMask cache:
   - MetaMask → Settings → Advanced → Clear activity tab data

---

## Implemented Improvements

- Signature timeout of 60 seconds
- Specific error messages for each problem
- Visual animation when waiting for signature
- Console log when requesting signature
- Better MetaMask error handling
- Clear status messages

---

**Developed for INSA Lyon - Blockchain Course**
