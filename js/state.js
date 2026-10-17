         
         
         
        let state = {
            currentUser: null,  
            view: 'login',  
            activeChat: null,
            calMonth: new Date().getMonth(),
            calYear: new Date().getFullYear(),
            calVenueId: null,
            sidebarOpen: false,  

            users: [],  
            admins: [],  
            venues: [],  
            bookings: [],  
            chats: [],  
            notifications: [],  
            closures: [],  
            logs: []  
        };

         
        let CATEGORIES = [];
        let COMMITTEE_TYPES = [];
