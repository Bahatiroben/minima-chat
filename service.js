/**
* SHOUTOUT backend service
* 
* @spartacusrex
*/

//Load js libs
MDS.load("puresha1.js");
MDS.load("xregexp-all.js");
MDS.load("jslib.js");
MDS.load("sql.js");
MDS.load("txn.js");

//Are we logging data
var logs = false;

function addStartupGroup(filters){
	var userpubkey  = "0x00";
	var title 		= "Start Here!";
	MDS.log("Inserting a message SAMPLE MESSAGE. USER:  "+title);
	if(!checkMsgBlockedSQL(filters,userpubkey)){
		insertMessage(title, "Shout Out", userpubkey, "Mx999", `sample message from robben! at ${Date.now()}`, 199, 0, function(res){});	
	}
}

var USER_PUBKEY = "";

//Main message handler..
MDS.init(function(msg){
	
	//Do initialisation
	if(msg.event == "inited"){
		
		//Init the DB		
		createDB(function(){
	
			//Notify of new messages..
			MDS.cmd("coinnotify action:add address:"+SHOUTOUT_ADDRESS,function(startup){});
	
			loadAllFilters(function(filters){
				MDS.log("Inserting initial messages:  ");
				//Insert some start up Groups
				addStartupGroup(filters);
				addStartupGroup(filters);
				addStartupGroup(filters);
				addStartupGroup(filters);
				addStartupGroup(filters);
				
				//User details
          		MDS.cmd("maxima", function (startup) {
	            	USER_PUBKEY = startup.response.publickey;
					MDS.log("Service Inited")
				});	
			});
		});
	
	}else if(msg.event == "NOTIFYCOIN"){
			
		//Is it the one that matters
		if(msg.data.address ==  SHOUTOUT_ADDRESS){
			
			//Check is Valid amount..
			if(msg.data.coin.tokenid != "0x00"){
				MDS.log("Message not sent as Minima.. ! "+msg.data.coin.tokenid);
				return;
			}else if(+msg.data.coin.amount < 0.01){
				MDS.log("Message below 0.01 threshold.. ! "+msg.data.coin.amount);
				return;
			}
		
			
			var msg_title 	 = stripBrackets(msg.data.coin.state[0]);
			var msg_message  = stripBrackets(msg.data.coin.state[1]);
			var msg_user 	 = stripBrackets(msg.data.coin.state[2]);
			var msg_randid 	 = stripBrackets(msg.data.coin.state[3]);
			var msg_pubkey 	 = stripBrackets(msg.data.coin.state[4]);
			var msg_sign 	 = stripBrackets(msg.data.coin.state[5]);
			
			// //Check non null..
			if(	msg_title 		=="" ||
				msg_message 	=="" ||
				msg_user 		=="" ||
				msg_randid 		=="" ||
				msg_pubkey	 	=="" ||
				msg_sign 		==""){
				MDS.log("Cannot have blank details in message..");
				return;
			}
			
			//get the address..
			var msg_address  = stripBrackets(msg.data.coin.state[6]);
			
			//Check if message is blocked..
			checkMsgBlocked(msg_pubkey,function(blocked){
				
				//Is it blocked..
				if(!blocked){
					
					//Check the signature..
					checkMessageSig(msg_title, msg_message, 
								msg_user, msg_pubkey, msg_address, msg_randid, msg_sign, function(valid){
									
						if(!valid){
							MDS.log("Invalid signature for "+msg_user + " HENCE can't add the message");
						}else{
							
							//Is ir from the user
							var from_user = (msg_pubkey == USER_PUBKEY);
							var read=0;
							if(from_user){
								read=1;
							}
							//Insert unread message - if not already added
							insertMessage( msg_title, 
								msg_user, msg_pubkey,msg_address, msg_message, msg_randid, read, function(inserted){
								//Do we notify the User
								if(inserted){
									MDS.log("Inserted a message:  "+msg_message);
								}	
							});					
						}
					});	
				} else {
					MDS.log("user us blocked...");

				}
			});
		}
	}
});		
