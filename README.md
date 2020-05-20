# supreme-monitor

Monitors items on supremenewyork.com in a MongoDB to notify users when an item has been added or restocked.

### Tech Stack
- NodeJS  
- MongoDB  

### Installation
1. Download & Extract ZIP
2. `cd` into directory
3. Run `npm install`
4. Install and Run [MongoDB](https://docs.mongodb.com/manual/installation/) 
5. Run `init.js`
6. Edit `monitor.js` Line 6 (Discord Webhoook) & Line 7 (Refresh Interval) to your liking, save.
7. Run `monitor.js` 
8. Observe

### Customizable
- [Discord Webhook](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks?page=1): Notifications will be sent to this webhook.
- Poll Interval: The rate at which it monitors the supreme items endpoint. HINT: 1000ms = 1 second
