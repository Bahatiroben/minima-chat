
function getMessageHash(title, message, user, pubkey, address, randid){
	//Create one long string..
	var fullmessage = title+message+user+pubkey+address+randid+"";
	var urlencoded	= encodeURIComponent(fullmessage);
	
	//Now hash it..
	return sha1(urlencoded);
}

function checkMessageSig(title, message, user, pubkey, address, randid, signature, callback){
	
	//First create the message signature..
	var hash = getMessageHash(title, message, user, pubkey, address, randid);
	
	//Now sign the hash..
	MDS.cmd("maxverify data:"+hash+" publickey:"+pubkey+" signature:"+signature,function(ver){
		if(ver.response.valid){
			callback(true);
		}else{
			callback(false);
		}		
	});
}

function sendTxnMessage(title, message, user, pubkey, address, randid, callback){
	
	//First create the message signature..
	var hash = getMessageHash(title, message, user, pubkey, address, randid);
		
	//Now sign the hash..
	MDS.cmd("maxsign data:"+hash,function(resp){
		var signature = resp.response.signature;
	
		//Now construct..
		var state = {};
		state[0] = "["+title+"]";
		state[1] = "["+message+"]";
		state[2] = "["+user+"]";
		state[3] = randid+"";
		state[4] = pubkey+"";
		state[5] = signature+"";
		state[6] = "["+address+"]";
		
		var func = "send storestate:false amount:0.01 address:"+SHOUTOUT_ADDRESS+" state:"+JSON.stringify(state);
		
		//run it..
		MDS.cmd(func,function(sendresp){
			if(callback){
				callback(sendresp);
			}
		});		
	});
}