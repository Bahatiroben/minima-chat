
function wipeDB(callback){
	//Run this..
	MDS.sql("DROP TABLE `shoutout`",function(msg){
		if(callback){
			callback();
		}
	});
}

function encodeStringForDB(str){
	return encodeURIComponent(str).split("'").join("%27");
	//return encodeURIComponent(str).replaceAll("'", "%27");
}

function decodeStringFromDB(str){
	return decodeURIComponent(str).split("%27").join("'");
	//return decodeURIComponent(str).replaceAll("%27", "'");
}

function createDB(callback){
	
	//Create the DB if not exists
	var initsql = "CREATE TABLE IF NOT EXISTS `shoutout` ( "
				+"  `id` bigint auto_increment, "
				+"  `title` varchar(1024) NOT NULL, "
				+"  `username` varchar(128) NOT NULL, "
				+"  `useraddress` varchar(128), "
				+"  `userpubkey` varchar(1024) NOT NULL, "
				+"  `message` varchar(4096) NOT NULL, "
				+"  `messageid` varchar(128) NOT NULL, "
				+"  `read` int NOT NULL, "
				+"  `created` bigint NOT NULL "
				+" )";
				
	//Run this..
	MDS.sql(initsql,function(msg){
		
		//And now the notify table..
		var filtersql = "CREATE TABLE IF NOT EXISTS `filter` ( "
			+"  `id` bigint auto_increment, "
			+"  `type` varchar(1024) NOT NULL, "
			+"  `username` varchar(128), "
			+"  `userpubkey` varchar(1024) "
			+" )";
		
		MDS.sql(filtersql,function(msg){
			if(callback){
				callback(msg);
			}	

		});
	});
}


function getUniqueMsgID(title, user, pubkey, message, randomid){
	return sha1(""+title+user+pubkey+message+randomid);
}

function checkMessageExists(title, user, pubkey, message, randomid, callback){
	var uniquemsgid = getUniqueMsgID(title, user, pubkey, message, randomid);
	messageExists(uniquemsgid, callback);
}

function messageExists(msgid, callback){
	var sql = "SELECT * FROM shoutout WHERE messageid='"+msgid+"'";
	MDS.sql(sql,function(sqlresp){
		if(sqlresp.count>0){
			callback(true);
		}else{
			callback(false);
		}
	});
}

function insertMessage(title, user, pubkey, address, message, randomid, read, callback){
	
	//Has this message been added already
	var msgid = getUniqueMsgID(title, user, pubkey, message, randomid);
	
	//See if it's already added..
	messageExists(msgid,function(exists){
		
		//If already added do nothing..
		if(exists){
			if(callback){
				callback(false);	
			}
			return;
		}
		
		//OK - add this message
		var startdate = new Date();
		var timemilli = startdate.getTime()
		
		
		//URL encode strings.. removes chance of SQL errors
		var enc_user 	=  encodeStringForDB(user);
		var enc_msg 	=  encodeStringForDB(message);
		
		var sql = "INSERT INTO shoutout(title,username,"
					+"useraddress,userpubkey,message,messageid,read,created) VALUES "+
					"('"+title+"','"+enc_user
					+"','"+address+"','"+pubkey+"','"+enc_msg+"','"+msgid+"',"+read+","+timemilli+")";
		
		//Run this..
		MDS.sql(sql,function(msg){
			//MDS.log(JSON.stringify(msg));
			if(callback){
				callback(true);
			}
		});		
	});
}


function selectRecentMessages(limit, offset, callback){
	//Create the DB if not exists
	var sql = "SELECT * FROM shoutout ORDER BY created DESC LIMIT "+limit+" OFFSET "+offset;
				
	//Run this..
	MDS.sql(sql,function(msg){
		callback(msg.rows);
	});
}

function selectUserMessages(userpubkey, limit, offset, callback){
	//Create the DB if not exists
	var sql = "SELECT * FROM shoutout WHERE userpubkey='"+userpubkey+"' ORDER BY created DESC LIMIT "+limit+" OFFSET "+offset;
				
	//Run this..
	MDS.sql(sql,function(msg){
		callback(msg.rows);
	});
}

function selectTopMessage(callback){
	//Create the DB if not exists
	var sql = "SELECT * FROM shoutout ORDER BY created DESC LIMIT 1";
				
	//Run this..
	MDS.sql(sql,function(msg){
		callback(msg.rows);
	});
}

function selectMessages(callback){
	//Create the DB if not exists
	var sql = "SELECT * FROM shoutout ORDER BY created DESC LIMIT 1024";
				
	//Run this..
	MDS.sql(sql,function(msg){
		//Reverse the rows..
		callback(msg.rows.reverse());
	});
}

function setAllRead(callback){
	//Create the DB if not exists
	var sql = "UPDATE shoutout SET read=1";
				
	//Run this..
	MDS.sql(sql,function(msg){
		if(callback){
			callback(msg);	
		}
	});
}



/**
 * Block Users
 */
function isUserBlocked(userpubkey, callback){
	var sql = "SELECT * FROM filter WHERE type='userblocked' AND userpubkey='"+userpubkey+"'";
	MDS.sql(sql,function(sqlresp){
		if(sqlresp.count>0){
			callback(true);
		}else{
			callback(false);
		}
	});
}

function addBlockUsers(username, userpubkey, callback){
	
	//And now delete all messages by that user..
	var deluser = "DELETE FROM shoutout WHERE userpubkey='"+userpubkey+"'";
	MDS.sql(deluser,function(del){
		isUserBlocked(userpubkey, function(allreadyblocked){
			if(!allreadyblocked){
				//Add user to blocked list
				var blockins = "INSERT INTO filter(type,username,userpubkey) VALUES ('userblocked','"+username+"','"+userpubkey+"')";
				MDS.sql(blockins,function(res){
					callback();	
				});		
			}else{
				MDS.log("Allready blocked..");
				callback();
			}
		});
	});
}

function selectBlockedUsers(callback){
	//Create the DB if not exists
	var sql = "SELECT type,username,userpubkey FROM filter WHERE type='userblocked' ORDER BY LOWER(username) ASC";
				
	//Run this..
	MDS.sql(sql,function(msg){
		callback(msg.rows);
	});
}

function removeBlockedUser(userpubkey,callback){
	//Create the DB if not exists
	var sql = "DELETE FROM filter WHERE type='userblocked' AND userpubkey='"+userpubkey+"'";
				
	//Run this..
	MDS.sql(sql,function(msg){
		callback(msg);
	});
}

function checkMsgBlocked(userpubkey,callback){
	
	//Create the DB if not exists
	var sql = "SELECT * FROM filter";
	
	//Run this..
	MDS.sql(sql,function(msg){
		var len = msg.rows.length;
		
		blocked = false;
		for(var i=0;i<len;i++){
			var filter = msg.rows[i];
			
			//Check BLocked user
			if(filter.TYPE == "userblocked"){
				if(filter.USERPUBKEY == userpubkey){
					blocked = true;
					break;
				}
			}
		}
		
		callback(blocked);
	});
}





function checkMsgBlocked(userpubkey, callback){
	
	//Create the DB if not exists
	var sql = "SELECT * FROM filter";
	
	//Run this..
	MDS.sql(sql,function(msg){
		var len = msg.rows.length;
		
		blocked = false;
		for(var i=0;i<len;i++){
			var filter = msg.rows[i];
			
			//Check BLocked user
			if(filter.TYPE == "userblocked"){
				if(filter.USERPUBKEY == userpubkey){
					blocked = true;
					break;
				}
			}
		}
		
		callback(blocked);
	});
}

function loadAllFilters(callback){
	//Run this..
	MDS.sql("SELECT * FROM filter",function(msg){
		callback(msg.rows);
	});
}

function checkMsgBlockedSQL(filters,userpubkey){
	
	var len = filters.length;
	
	blocked = false;
	for(var i=0;i<len;i++){
		var filter = filters[i];
		
		//Check BLocked user
		if(filter.TYPE == "userblocked"){
			if(filter.USERPUBKEY == userpubkey){
				blocked = true;
				break;
			}
		}
	}
	
	return blocked;
}