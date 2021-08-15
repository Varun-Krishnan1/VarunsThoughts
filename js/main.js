$(document).ready(function() {

/** Developer Functions **/ 

/* To add display name in console once user is logged in 
var user = firebase.auth().currentUser; 
user.updateProfile({
	displayName: "Test Subject"
}) 
*/


/* To create new sticky notes for new topics */ 
	
// function developerCreateNewSticky(newTopic, stickyTitle, stickyAdd, stickyHeadings) {
// 	var newDocRef = db.collection("SiteContent").doc("Topics").collection(newTopic).doc("StickyNote")
// 	newDocRef.set({
// 		StickyAdd: stickyAdd, 
// 		StickyHeadings: stickyHeadings, 
// 		StickyTitle: stickyTitle 
// 	})

// 	// -- favorites collection in sticky note will automatically be made when user adds the'r first sticky! 
// }

// var newTopic = 'Skiing';
// var stickyTitle = "N/A" ;
// var stickyAdd = "N/A";
// var stickyHeadings = ['N/A', 'N/A', 'N/A'];
// developerCreateNewSticky(newTopic, stickyTitle, stickyAdd, stickyHeadings);




	// -- Initializing Materialize Components 
	$('.modal').modal();    

	// -- global variables 
	var user = null; 
	var currentTab = 'Investing';
	var thoughtsAdded; 
	var totalThoughtsOnTopic; 
	var topics = []
	var transitionInterval; 


	// listen for auth status changes 
	auth.onAuthStateChanged(client => {
		user = client; 
		console.log(user)
		if (user) {
			console.log("user logged in: ", user); 
			// -- start at home 
			currentTab = "Home";
			showLoggedInContent(user);
		} else {
			console.log('user logged out');
			hideLoggedInContent();
		}
	})

	// -- Login modal and logout 
	const loginForm = document.querySelector('#login-form');
	loginForm.addEventListener('submit', (e) => {
		e.preventDefault(); 

		// get user info 
		const email = loginForm['login-email'].value; 
		const password = loginForm['login-password'].value; 

		// sign them in 
		auth.signInWithEmailAndPassword(email, password).then(cred => {
				// inform user they are logged in 
				var toastHTML = '<i class="material-icons">check_circle</i>Logged in!'
				M.toast({html: toastHTML, classes: 'rounded standard-toast'})

				// close the signup modal & reset form
				const modal = document.querySelector('#modal-login');
				M.Modal.getInstance(modal).close();
				loginForm.reset();

				// change login button to their bio 

		}).catch(function(error) {
			var errorCode = error.code; 
			var errorMessage = error.message; 
			console.log(errorCode);
			console.log(errorMessage);
			$("#incorrect-dialog").addClass("show-incorrect");
			if(errorCode == "auth/network-request-failed") {
				$("#incorrect-dialog").text("Internet Disconnected. Connect to Internet and try again.")
			}

		})
	})

	$("#logout-btn").on('click', () => {
		auth.signOut();
		console.log("Signed Out")
	});

	// -- Updating UI based on login or logout 

	function showLoggedInContent(user) {
		showLoggedInHeader(); 
		
		// -- start logged in thoughts with current date 
		//showLoggedInThoughts(currentTab, moment().format("YYYY-MM-DD"));

		// -- show containers that hideLoggedInContent hid 
		$(".filters").show();
		$(".home-top").show();
		$(".thoughts-container-home").show();
		$("#main-title").show();
		
		if(currentTab != "Home") {
			showLoggedInThoughts(currentTab);
			showLoggedInSticky(currentTab);
		}

		// -- add navtab and search functions only after thoughts loaded(ideally)
		addNavTabFunctions(); 
		addDateFilterFunction();
		addSearchFilterFunction();

		// -- start logged in on home 
		$("#Home").trigger("click");
		
		// -- get all topics for search button 
		retrieveTopics();
	}

	function addDateFilterFunction() {
		$("#submit-filter").on("click", function() {
			var filteredDate = $("#date-filter").val();
			addThoughtsFromTopic(currentTab, filteredDate);
		})
	}

	function retrieveTopics() {
		// -- iterate through navbar to get topics 
		$(".navtab-heading").each(function() {
			topics.push($(this).attr("id"));
		})
		// -- remove first topic(home) and last topic(starred)
		topics.shift(0);
		topics.pop() 
	}

	function addNavTabFunctions() {
		$(".navtab-heading").each(function() { 
			$(this).on('click', function() {
				// -- clear interval if coming from home page 
				clearInterval(transitionInterval);
				// -- add highlight 
				$('.navtab-item').removeClass("active-tab");
				$(this).parents('.navtab-item').addClass("active-tab");
				// -- set current tab 
				var navTopic = $(this).attr("id");
				currentTab = navTopic ;

				// -- change heading 
				$(".section-title").text(currentTab);

				// -- different logic for home page 
				if($(this).attr("id") == "Home") {
					drawHomePage(); 
					return 
				}
				else {
				// -- show all content in case coming from home or starred 
				hideHomeContent();

				// -- no stickies for skiing or starred 
				if(currentTab == "Skiing" || currentTab == "Starred") {
					$("#stickies-dom").hide();
				}

				// -- different logic for starred page 
				if(currentTab == "Starred") {
					drawStarredPage();
					return
				}


				// -- show thoughts and stickies and stars 
				showLoggedInThoughts(currentTab);
				showLoggedInSticky(currentTab);
				}
			})
		})
	}

	function drawStarredPage() {
		$(".thoughts-container").html('');
		// -- hide add thought button 
		$(".add-thought-container").hide();

		db.collection("Users").doc(user.uid).get().then((doc) => {
			// -- get starred array from user doc 
			var starred = doc.data().starred; 
			// -- for each thought document reference 
			starred.forEach(function(docRef) {
				docRef.get().then((thought) => {
					// -- get path of that reference 
					var segments = thought.ref.path.split("/");
					console.log(segments);
					// -- remove first item, user thoughts, and topic 
					segments.shift(); 
					segments.splice(segments.indexOf("UserThoughts"), 1);
					// -- the topic is at index 1 so splice that 
					segments.splice(1, 1);
					// -- [date, user.uid, thought.id] 
					// -- add on thought fields 
					var title = thought.data().Title;
					var content = thought.data().Content;
					var takeaway = thought.data().Takeaway;
					// -- [date, user.uid, thought.id, title, content, takeaway]
					segments = segments.concat([title, content, takeaway]);
					
					addThoughtToPage(segments);
				})
			})
		})
	}

	function hideHomeContent() {
		$("#home-page-content").hide();
		$("#thoughts-dom").show(); 
		$(".filters").show();
		$("#stickies-dom").show();
		$("#sticky-note-div").show();
	}

	function addSearchFilterFunction() {
		$(".search-submit-button").on('click', function() {
			// -- get keyword from input 
			var keywords = $("#search-bar").val(); 
			
			// -- wipe screen for search results 
			// -- in case you came from home 
			hideHomeContent();

			$(".section-title").text("Search Results");
			$(".thoughts-container").html('');
			
			// -- add thoughts that match 
			findInThought(keywords);
			

			// -- remove highlighting on navtab 
			$("#" + currentTab).parents('.navtab-item').removeClass("active-tab");
			currentTab = "Search";
		})
	}

	function findInThought(keywords) {
		// -- make string lowercase and split into array 
		keywords = keywords.toLowerCase(); 
		var searchFilter = keywords.split(" ");
		console.log(searchFilter);
		// -- get all dates 
		db.collection("Thoughts").get().then((dateDocs) => {
			// -- iterate through all dates 
			dateDocs.forEach(function(dateDoc) { 
				// -- iterate through all topics in each date if topic exists 
				topics.forEach(function(topic) {
					// -- parse the date doc for each topic with a search filter
					parseDateDoc(dateDoc, topic, searchFilter);
				})
			})
		})
	}

	function drawHomePage() {
		// -- hide thoughts and stickies dom 
		$("#thoughts-dom").hide(); 
		$("#stickies-dom").hide();

		db.collection("SiteContent").doc("Topics").collection("Home").doc("HomeContent").get().then((doc) => {
			// -- if they haven't clicked away yet draw it 
			if(currentTab == "Home") {
				$("#home-important-name").text(doc.data().ImportantName);
				$(".thought-author-home").text(doc.data().authors);
				$(".thought-headline-home").text(doc.data().homeHeadline);
				$(".thought-item-body-home").text(doc.data().homeContent);
				$("#home-date").text(doc.data().birthday);

				// get pictures
				storageRef.child('/images/hs.png').getDownloadURL().then((url) => {
					$("#profile-image").attr("src", url);
					// storageRef.child('/images/business.png').getDownloadURL().then((url2) => {
					// 	transitionHomeImages(url, url2)
					// 	transitionInterval = window.setInterval(function() {
					// 		transitionHomeImages(url, url2) }, 10000);
					// })
				})


				console.log("Home Page Written")
				$("#home-page-content").show();
			}
		})
		
	}

	function transitionHomeImages(img1, img2) {
		if($("#profile-image").attr("src") == img1) {
			$("#profile-image").attr("src", img2);
		}
		else {
			$("#profile-image").attr("src", img1);
		}
	}

	function showLoggedInHeader() {
		// show logout button 
		$("#logout-div").show();

		// update login to show who is logged in 
		db.collection('Users').doc(user.uid).get().then(userdoc => {
			$("#login-text").text("Logged in as " + userdoc.data().description + " " + user.displayName);
		});
	}

	function showLoggedInThoughts(topic, dateFilter) {
		$(".thoughts-container").html('');
		addThoughtsFromTopic(topic, dateFilter);
		addThoughtButton();
	}


	function addThoughtButton() {
		// -- show it just in case coming from logout 
		$(".add-thought-container").show();
		// -- remove old event listener 
		$(".add-thought-container").off() 
		// -- add thought button functionality 
		$(".add-thought-container").on('click', function() {
			// -- only allow adding new editor if no editor exists in thoughts 
			if($(".thought-item-editor").length > 0) {
				var toastHTML = '<i class="material-icons">error</i>A Thought Editor is Already Open!'
				M.toast({html: toastHTML, classes: 'rounded standard-toast'})
				return 
			}
			// -- if no editor is open 
			addNewCardEditorToPage();
		})
	}

	function hideLoggedInContent() {
		// hide logout button 
		$("#logout-div").hide();
		$("#login-text").text("Login")

		$(".section-title").show() 
		$(".section-title").text("Please Login.")

		$(".navtab-heading").off();

		$(".home-top").hide();
		$(".thoughts-container-home").hide();

		$(".thoughts-container").html('');
		$("#sticky-note-div").hide();
		$(".filters").hide();
		$("#add-stock-btn").text('');

	}

	function addThoughtsFromTopic(topic, dateFilter) {
		var collectionRef = db.collection("Thoughts");
		// -- if dateFilter but you are on search results just hide one's that don't match
		// -- and show ones that do 
		if(dateFilter) {
			// -- each thought has a datetime attribute that matches filter format 
			console.log(dateFilter);
			$(".thought-item").each(function() {
				var dateWritten = $(this).find('time').attr("datetime")
				console.log(dateWritten)
				if(dateWritten === dateFilter) {
					console.log("Date Found")
					$(this).show();
				}
				else {
					$(this).hide();
				}
			})
		}
		// // -- if dateFilter passed only get that date's document 
		// else if(dateFilter) {
		// 	// -- convert dateFilter to dateID 
		// 	dateFilter = moment(dateFilter, "YYYY-MM-DD").format("MM-DD-YY");
		// 	console.log(dateFilter);
		// 	// -- should return only one doc 
		// 	db.collection("Thoughts").doc(dateFilter).get().then(function(doc) {
		// 		console.log(doc.id);
		// 		parseDateDoc(doc, topic);
		// 	})
		// }
		// -- just drawing with no date filter 
		else {
			// -- get every date doc in thoughts collection 
			db.collection("Thoughts").get().then(function(querySnapshot) {
				// -- for each date document 
				querySnapshot.forEach(function(doc) {
					console.log(doc.id);
					parseDateDoc(doc, topic)
		 		})
			});
		}
	}

	function parseDateDoc(doc, topic, searchFilter) {
	// -- get every user doc from a given topic collection in date
		doc.ref.collection(topic).get().then( (userSnapshot) => {
			// -- for each user uid document 
			userSnapshot.forEach(function(userDoc) {
				// -- get user thoughts collection 
				userDoc.ref.collection('UserThoughts').get().then((userThoughts) => {
					// -- for each user thought document 
					userThoughts.forEach(function(thought) {
						var segments = thought.ref.path.split("/");
						// -- remove first item, user thoughts, and topic 
						segments.shift(); 
						segments.splice(segments.indexOf("UserThoughts"), 1);
						segments.splice(segments.indexOf(topic), 1);
						// -- [date, user.uid, thought.id, title]
						// -- add on thought fields 
						var title = thought.data().Title;
						var content = thought.data().Content;
						var takeaway = thought.data().Takeaway;
						// -- [date, user.uid, thought.id, title, content, takeaway]
						segments = segments.concat([title, content, takeaway]);

						// -- if there is a search filter only add thoughts that match 
						if(searchFilter) {
							if( searchFilter.some(v => title.toLowerCase().includes(v)) || searchFilter.some(v => content.toLowerCase().includes(v)) ) {
								console.log("Match Found")
								addThoughtToPage(segments);
							}
						}
						// -- if no search filter just add it to page 
						else {
							// -- add thought as long as they haven't gone to another tab 
							if(currentTab == topic) {
								addThoughtToPage(segments);
							}
						}
					})
				})
			})
		})
	}
	
	// arr -> [date, user.uid, thought.id, title, content, takeaway]
	function addThoughtToPage(arr) {
		// -- convert date to format we want 
		var date1 = moment(arr[0], "MM-DD-YY").format("YYYY-MM-DD")
		var date2 = moment(arr[0], "MM-DD-YY").format("MMMM D, YYYY");

		// -- convert uid to author 
		var userUID = arr[1]
		db.collection('Users').doc(userUID).get().then((data) => {
			var author = data.data().name; 

			// -- rest of variables 
			var thoughtID = arr[2];
			var title = arr[3];
			var content = arr[4];
			var takeaway = arr[5];
			var thoughtHTML = 
			`
				<div class="thought-item" id=${thoughtID}>
					<div class="thought-byline">
						<a>
							<time datetime=${date1}>
								${date2} |
							</time>
							<span class="thought-author">
								${author}
							</span>
						</a>
						<div class="thought-actions right">
							<a><i class="edit-btn material-icons">edit</i></a>
							<a><i class="star-btn material-icons">star_border</i></a>
							<a><i class="trash-btn material-icons">delete</i></a>
						</div>
					</div>
					<h3 class="thought-headline">${title}</h3>
					<div class="thought-item-body">
						${content}	
					</div>
					<div class="thought-takeaway">
						<hr>
						<b>Takeaway: </b>${takeaway}
					</div>
				</div>
			`

			// -- append item to thought container 
			console.log("Drawing Element..." + thoughtID);
			$(".thoughts-container").append(thoughtHTML);

			// -- now add stars again 
			showStarsOnPage()

			// -- add images 
			addImageToThought(thoughtID);

			// -- add button functionalities for this SPECIFIC card! 
			if(currentTab == "Starred") {
				// -- editing and deleting not yet allowed on starred page 
				$(".edit-btn").hide();
				$(".trash-btn").hide();

				$("#" + thoughtID).find('.star-btn').on('click', function() {
					var toastHTML = '<i class="material-icons">error</i>Go to topic to remove thought from starred!'
					M.toast({html: toastHTML, classes: 'rounded standard-toast'})
				})
			}
			else {
				addEditingButtonsFunctionality(thoughtID);					
			}
		})
		
		
	}

	function addEditingButtonsFunctionality(thoughtID) {
		// -- edit button 
		$("#" + thoughtID).find(".edit-btn").on('click', function() {
				// -- only allow adding new editor if no editor exists in thoughts 
				if($(".thought-item-editor").length > 0) {
					var toastHTML = '<i class="material-icons">error</i>A Thought Editor is Already Open!'
					M.toast({html: toastHTML, classes: 'rounded standard-toast'})
					return 
				}
				var thought = $(this).parents('.thought-item');
				addEditThoughtEditor(thought.attr('id'));
			})

		// -- star button 
		$("#" + thoughtID).find('.star-btn').on('click', function() {
			// -- check if starred or not 
			var isStarred = $(this).hasClass('full-star')
			// -- get thought item and icon 
			var thought = $(this).parents(".thought-item")
			var starIcon = $(this);
			// -- get date writte and id and user who wrote it 
			var dateWritten = moment(thought.find("time").attr("datetime"), "YYYY-MM-DD").format("MM-DD-YY");
			var id = thought.attr('id');
			var author = thought.find(".thought-author").text().trim();
		
			// -- convert author to uid 
			db.collection("Users").where("name", "==", author).get().then((doc) => {
				// -- should return only one doc 
				doc.forEach(function(userDoc) {
					var uid = userDoc.id	
					// -- if already in starred 
					if(isStarred) {
						console.log("Removing from starred...")
						// -- change back to border star 
						starIcon.text('star_border');
						starIcon.removeClass('full-star')

						// -- remove thought from starred 
						getThoughtFromStarred('delete', id, uid, dateWritten);

					}
					// -- if not in starred yet 
					else {
						// -- change to full star 
						starIcon.text('star')
						starIcon.addClass('full-star');

						// -- add thought to starred		
						getThoughtFromStarred('update', id, uid, dateWritten);

					}
				})
			})
			// -- check if starred or not 

			
		})
		// -- trash button 
		$("#" + thoughtID).find(".trash-btn").on('click', function() {
			// -- confirm they want to delete 
			var title = $(this).closest('.thought-byline').siblings('.thought-headline').text();
			var question = 'Are you sure you want to delete ' + title + '?'

			if(confirm(question)) {
				var thought = $(this).parents('.thought-item');
				getThought(thought.attr('id'), 'delete', []);

				thought.fadeOut('slow', function() {
					thought.remove();
				});
			}
		})

	}

	function showStarsOnPage() {
		db.collection("Users").doc(user.uid).get().then((doc) => {
			var starred = doc.data().starred; 
			starred.forEach(function(docRef) {
				var id = docRef.id; 
				$("#" + id).find(".star-btn").text('star');
				$("#" + id).find(".star-btn").addClass('full-star');
			})
		})
	}

	function getThoughtFromStarred(action, thoughtID, authorUID, dateWritten) {
		var thoughtRef = db.collection("Thoughts").doc(dateWritten).collection(currentTab).doc(authorUID).collection("UserThoughts").doc(thoughtID);
		if(action == 'update') {
				db.collection("Users").doc(user.uid).update({
				starred: firebase.firestore.FieldValue.arrayUnion(thoughtRef)
			}).then(() => {
				console.log(thoughtID + " addded to starred!");
			})
		}
		else if(action == 'delete') {
			db.collection("Users").doc(user.uid).update({
				starred: firebase.firestore.FieldValue.arrayRemove(thoughtRef)
			}).then(() => {
				console.log(thoughtID + " deleted from starred!");
			})
		}
	}

	function addEditThoughtEditor(thoughtID) {

		var thought = $("#" + thoughtID); 

		// -- add ids to elements 
		thought.addClass("thought-item-editor");
		thought.find('.thought-headline').attr('id', 'thought-editor-title');
		thought.find('.thought-item-body').attr('id', 'thought-editor')
		thought.find('.thought-takeaway p').attr('id', 'thought-editor-takeaway');

		// -- take away standard buttons 
		thought.find(".thought-actions").hide(); 

		// -- add new editor buttons 
		var editorButtonsHTML = 
		`
		<div class="thought-actions right">
			<a id="thought-editor-submit"><i class="material-icons">check</i></a>
			<a id="thought-editor-cancel"><i class="material-icons">clear</i></a>
			<a id="thought-editor-delete"><i class="material-icons">delete</i></a>
		</div>
		`
		thought.find('.thought-byline').append(editorButtonsHTML);

		// -- add EDIT CARD title 
		var editCardHTML=
		`
		<div class="edit-card-headline">EDIT CARD</div>
		`
		thought.prepend(editCardHTML);

		// -- add inline editors 
		addInlineEditors('Edit-Card'); 	
	}


	function getThought(thoughtID, action, update_arr) {
		// /Thoughts/06-17-20/Investing/2RWt88QmSkd5HfeAimzQiqY7czB3/UserThoughts/v7t2fAwU8gHb9KKoSrJS

		var thought = $("#" + thoughtID);
		var dateWritten = moment(thought.find("time").attr("datetime"), "YYYY-MM-DD").format("MM-DD-YY");
		var topic = currentTab; 
		var author = thought.find(".thought-author").text().trim();
		// -- convert author to uid 
		db.collection("Users").where("name", "==", author).get().then((doc) => {
			// -- should return only one doc 
			doc.forEach(function(userDoc) {
				var uid = userDoc.id
				if(action == 'delete') {
					db.collection("Thoughts").doc(dateWritten).collection(topic).doc(uid).collection("UserThoughts").doc(thoughtID).delete().then(() => {
					console.log("Document " + thoughtID + " deleted");
					// -- add toast that card was deleted 
					var toastHTML = '<i class="material-icons">delete_forever</i>Thought Deleted'
						M.toast({html: toastHTML, classes: 'rounded standard-toast'})
					// -- redraw screen once action complete 
					showLoggedInThoughts(currentTab);
					});
				}
				else if(action == 'update') {
					db.collection("Thoughts").doc(dateWritten).collection(topic).doc(uid).collection("UserThoughts").doc(thoughtID).update({
						Title: update_arr[0], 
						Content: update_arr[1], 
						Takeaway: update_arr[2]
					}).then(() => {
						console.log(thoughtID + " updated!")
						// -- add toast that card was updated 
						var toastHTML = '<i class="material-icons">border_color</i>Thought Updated!'
						M.toast({html: toastHTML, classes: 'rounded standard-toast'})
						// -- redraw screen once action complete 
						showLoggedInThoughts(currentTab);
					})
				}
				
			})
		})
	}

	function addNewCardEditorToPage() {
		var editorHTML = 
		`
			<!-- ckeditor --> 
			<div class="thought-item thought-item-editor">
			<div class="edit-card-headline">NEW CARD</div>
				<div class="thought-byline">
					<a>
						<time datetime="${moment().format("YYYY-MM-DD")}">
							${moment().format("MMMM D, YYYY")} |
						</time>
						<span class="thought-author">
							${user.displayName}
						</span>
					</a>
					<div class="thought-actions right">
						<a id="thought-editor-submit"><i class="material-icons">check</i></a>
						<a id="thought-editor-delete"><i class="material-icons">delete</i></a>
					</div>
				</div>
				<p id="thought-editor-title" class="thought-headline">"What we think, we become."  -  Buddha</p>
				<div class="thought-item-body">
					<div id="thought-editor">
					“Five percent of the people think;
					<br>
					ten percent of the people think they think;
					<br>
					and the other eighty-five percent would rather die than think."
					<br> - Thomas A. Edison
					</div>
				</div>
				<div class="thought-takeaway">
					<hr>
					<span><b>Takeaway: </b></span><div id="thought-editor-takeaway">"It is not enough to have a good mind; the main thing is to use it well." - Descartes
				</div>
			</div>
		`

		$(".thoughts-container").prepend($(editorHTML).hide());
		setTimeout(function() {
			$(".thought-item-editor").fadeIn('slow');
		}, 50)

		addInlineEditors('New-Card');

		
	}

	function addInlineEditors(cardType) {
		// -- add editor functionality 
		let titleEditor;
		let bodyEditor;
		let takeawayEditor;  

		InlineEditor
			.create(document.querySelector("#thought-editor"), {
					mediaEmbed: {
          	  			removeProviders: [ 'youtube' ]
          	  		}
			})
			.then(newEditor => {
			bodyEditor = newEditor; 
		});

		InlineEditor
			.create(document.querySelector("#thought-editor-takeaway"), {
				toolbar: ['bold', 'italic'],
				mediaEmbed: {
          	  		removeProviders: [ 'youtube' ]
          	  	}
			})
			.then(newEditor => {
			takeawayEditor = newEditor; 
		});

		InlineEditor
			.create(document.querySelector("#thought-editor-title"), {
				toolbar: ['italic'],
				mediaEmbed: {
          	  		removeProviders: [ 'youtube' ]
          	  	}
			}).then(newEditor => {
				titleEditor = newEditor; 
			})

		if(cardType == 'Edit-Card') {

			// -- add editor button functionality 
			$("#thought-editor-submit").on('click', function() {
				titleData = titleEditor.getData(); 
				editorData = bodyEditor.getData(); 
				takeawayData = takeawayEditor.getData();
				var thoughtID = $(".thought-item-editor").attr("id");

				// -- if there's an image on this thought 
				if($(editorData).find("img").length > 0) {
					// -- notify they're uplaoding the image 
					var toastHTML = '<i class="material-icons">cloud_upload</i>Saving...'
					M.toast({html: toastHTML, classes: 'rounded standard-toast'
								});
					// -- get unique id for image then upload 
					var img_counter = 0; 
					$(editorData).find("img").each(function() {
						// -- skip upload if there's already an upload url 
						if($(this).attr("src").startsWith("https")) {
						// -- this will redraw screen too only once thought is uploaded 
							getThought(thoughtID, 'update', [titleData, editorData, takeawayData]); 
							return
						}
						// -- increment img_counter for unique ids 
						img_counter ++ 
						// -- get source 
						var imageData = $(this).attr("src");
						// -- generate random number for id 
						var id = Date.now() + Math.random() + '-' + img_counter
						storageRef.child('images/' + id).putString(imageData, 'data_url').then(function(snapshot) {
							console.log("Image Uploaded!");
							// -- after image uploaded set src attribute to title 
							editorData = editorData.replace(imageData, id);
							console.log(editorData);

							// -- get id and update it in db 
							getThought(thoughtID, 'update', [titleData, editorData, takeawayData]); 
							}
						)
					})
				}
				else {
				// -- get id and update it in db 
				getThought(thoughtID, 'update', [titleData, editorData, takeawayData]); 
				}

			})

			$("#thought-editor-cancel").on('click', function() {
				// -- just redraw page if they cancel editing a card 
				showLoggedInThoughts(currentTab)
				// -- add toast that their edit was canceled 
				var toastHTML = '<i class="material-icons">cancel</i>Edit Canceled!'
				M.toast({html: toastHTML, classes: 'rounded standard-toast'
					});
			})

			$("#thought-editor-delete").on('click', function() {
				// -- confirm they want to delete 
				var title = $(this).closest('.thought-byline').siblings('.thought-headline').text();
				var question = 'Are you sure you want to delete ' + title + '?'

				if(confirm(question)) {
					var thought = $(this).parents('.thought-item');
					getThought(thought.attr('id'), 'delete', []);

					thought.fadeOut('slow', function() {
						thought.remove();
					});
				}
			})
		
		}
		else if(cardType == 'New-Card') {

			// -- add editor button functionality 
			$("#thought-editor-submit").on('click', function() {
				titleData = titleEditor.getData(); 
				editorData = bodyEditor.getData(); 
				takeawayData = takeawayEditor.getData();

				// -- parse image data 
				if($(editorData).find("img").length > 0) {
					var toastHTML = '<i class="material-icons">cloud_upload</i>Saving...'
					M.toast({html: toastHTML, classes: 'rounded standard-toast'
								});
					var img_counter = 0; 
					$(editorData).find("img").each(function() {
						// -- increment img_counter 
						img_counter ++ 
						// -- get source 
						var imageData = $(this).attr("src");
						// -- generate random number for id 
						var id = Date.now() + Math.random() + '-' + img_counter
						storageRef.child('images/' + id).putString(imageData, 'data_url').then(function(snapshot) {
							console.log("Image Uploaded!");
							// -- after image uploaded set src attribute to title 
							editorData = editorData.replace(imageData, id);
							console.log(editorData);	

							// -- this function also redraws after submitting new thought 
							writeNewThoughtToDb(titleData, editorData, takeawayData); 
							// -- add toast that they added a new thought
							var toastHTML = '<i class="material-icons">add_to_photos</i>New Thought Added!'
							M.toast({html: toastHTML, classes: 'rounded standard-toast'});
							}
						)
					})
				}
				else {
					// -- this function also redraws after submitting new thought 
					writeNewThoughtToDb(titleData, editorData, takeawayData); 
					// -- add toast that they added a new thought
					var toastHTML = '<i class="material-icons">add_to_photos</i>New Thought Added!'
					M.toast({html: toastHTML, classes: 'rounded standard-toast'
					});
				}
				
			})

			$("#thought-editor-delete").on('click', function() {
				// -- confirm they want to delete 
				var title = $(this).closest('.thought-byline').siblings('.thought-headline').text();
				var question = 'Are you sure you want to delete ' + title + '?'
				
				if(confirm(question)) {
					$(".thought-item-editor").fadeOut('slow', function() {
						$(".thought-item-editor").remove();
					});
					console.log("New Card Deleted");
					// -- add toast that they deleted new thought 
					var toastHTML = '<i class="material-icons">cancel</i>New Thought Canceled!'
					M.toast({html: toastHTML, classes: 'rounded standard-toast' });
				}

			})

		}
		
	}


	function addImageToThought(thoughtID) {
		console.log("Adding image to " + thoughtID + "....")
		$("#" + thoughtID).find("img").each(function() {
			var id = $(this).attr("src");
			var img = $(this)
			storageRef.child('/images/' + id).getDownloadURL().then(function(url) {
				img.attr("src", url);
			})
		})
	}



	// -- function will also dynamically create documents not existing 
	function writeNewThoughtToDb(title, content, takeaway) {
		var date = moment().format("MM-DD-YY");
		//var date = '06-15-20' <- Can manually set date for new thought 
		const dateRef = db.collection("Thoughts").doc(date);
		dateRef.get().then((dateDoc) => {
			// -- check if date exists 
			if(!dateDoc.exists) {
				console.log("Creating new date...")
				dateRef.set({});
			}

			// -- collections automatically get created 
			const userThoughtDoc = dateDoc.ref.collection(currentTab).doc(user.uid);
			userThoughtDoc.get().then((userDoc) => {
				// --  check if user doc exists  
				if(!userDoc.exists) {
					console.log("Creating user doc for date...")
					userThoughtDoc.set({});
				}

				userDoc.ref.collection("UserThoughts").add({
					Title: title, 
					Content: content, 
					Takeaway: takeaway 
				}).then(function(docRef) {
					console.log("Document written with ID: ", docRef.id);
					// -- redraw page 
					showLoggedInThoughts(currentTab);
				})
			})
		})
	}
		

	/**** Sticky Notes ****/ 

	function showLoggedInSticky(topic) {
		$("tbody").html('')
		addStickiesFromTopic(topic);
	}

	function addStickyButton(stickyAdd) {
		// -- add stock functionality 
		$(".add-to-note").html(
			`
				<a id="add-stock-btn"><i class="material-icons">add</i>
				<span>${stickyAdd}</span></a>
			`)
		$("#add-stock-btn").on('click', function() {
			addNewStickyEditor();
		})
	}

	function addStickiesFromTopic(topic) {
		db.collection('SiteContent').doc("Topics").collection(topic).doc("StickyNote").get().then((stickyDoc) => {
			// -- get sticky headings and title 
			var stickyTitle = stickyDoc.data().StickyTitle; 
			var stickyHeadings = stickyDoc.data().StickyHeadings; 
			var stickyAdd = stickyDoc.data().StickyAdd; 
			addStickyHeadings(stickyTitle, stickyHeadings);
			addStickyButton(stickyAdd);

			stickyDoc.ref.collection("Favorites").get().then(function(eachFav) {
				eachFav.forEach(function(fav) {
					// -- add as long as on same tab 
					if(currentTab == topic) {
						addStickyRow(fav);
					}
				})	
			})
		})
	}

	function addStickyHeadings(stickyTitle, stickyHeadings) {
		$(".sticky-headline").text(stickyTitle);
		$("#sticky-field-one").text(stickyHeadings[0])
		$("#sticky-field-two").text(stickyHeadings[1])
		$("#sticky-field-three").text(stickyHeadings[2])
	}

	function addStickyRow(item) {
		// -- item is the document of each sticky 
		var stickyId = item.id; 
		var f1 = item.data().fieldone; 
		var f2 = item.data().fieldtwo; 
		var f3 = item.data().fieldthree; 
		var f1_link= 'https://www.google.com/search?q=' + f1;

		// -- change fields based on topic 
		if(currentTab == "Investing") {
			f1_link = "https://www.finance.yahoo.com/quote/" + f1;
		}
		else if(currentTab == "Tennis") {
			f2 = `<a href="${f2}" target="_blank">Video 1</a>`
			f3 = `<a href="${f3}" target="_blank">Video 2</a>`
			console.log(f2);
		}

		// https://www.youtube.com/watch?v=P9LzWVbck0o
		// https://www.youtube.com/watch?v=ScKohNh-1E8

		var rowHTML = 
		`
		<tr id=${stickyId}>
			<td><i class="material-icons">cancel</i></td>
			<td class="stock-symbol-col">
				<a href="${f1_link}" target="_blank">${f1}</a>
			</td>
			<td class="date-added-col">${f2}</td>
			<td class="reason-col right">
				${f3}
			</td>
		</tr>
		`
		$("tbody").append(rowHTML);

		// -- add button functionality 
		$("#" + stickyId).find('i').on('click', function() {
			var stickyID = $(this).parents("tr").attr("id");
			
			deleteStickyFromDb(stickyID);
			
			$("#" + stickyID).fadeOut('slow', function() {
				$("#" + stickyID).remove();
			});
		})
	}

	function addNewStickyEditor() {
		f2 = "Field2" 
		if(currentTab == "Investing") {
			f2 = moment().format("MM/DD/YY");
		}
		var editorHTML = 
		`
		<tr id="sticky-editor-row">
			<td><i id="sticky-editor-delete" class="material-icons">cancel</i></td>
			<td id="td-sticky-editor" class="stock-symbol-col">
				<div id="editor-field-one">Field1</div>
			</td>
			<td class="date-added-col">
				<div id="editor-field-two">${f2}</div>
			</td>
			<td class="reason-col right">
				<div id="editor-field-three">Field3</div>
			</td>
		</tr>
		`
		$("tbody").append(editorHTML);
		addStickyInlineEditor(); 
	}

	function addStickyInlineEditor() {
		let fieldOneEditor;
		let fieldTwoEditor;
		let fieldThreeEditor;  

		InlineEditor
			.create(document.querySelector("#editor-field-one"), {
				toolbar: [],
				mediaEmbed: {
          	  		removeProviders: [ 'youtube' ]
          	  	}
			})
			.then(newEditor => {
			fieldOneEditor = newEditor; 
		});

		// -- allow editing of second field if it's not investing sicky 
		if(currentTab != "Investing") {
				InlineEditor
				.create(document.querySelector("#editor-field-two"), {
					toolbar: [],
					mediaEmbed: {
          	  		removeProviders: [ 'youtube' ]
          	  		}
				})
				.then(newEditor => {
				fieldTwoEditor = newEditor; 
			});
		}

		InlineEditor
			.create(document.querySelector("#editor-field-three"), {
				toolbar: [],
				mediaEmbed: {
          	  		removeProviders: [ 'youtube' ]
          	  	}
			}).then(newEditor => {
				fieldThreeEditor = newEditor; 
			})

		// -- add editor button functionality 
		var deleteBtn = $("#sticky-editor-delete")


		// -- change text of add thought 
		var addStickyHTML = 
		`
		<a id="sticky-editor-submit">
			<i class="material-icons">check</i>
			<span id="BDF">Confirm New Row</span>
		</a>
		`
		$(".add-to-note").html(addStickyHTML);

		// -- add button functions 
		$("#sticky-editor-submit").on('click', function() {
			var fieldTwoData = moment().format("MM/DD/YY");

			var fieldOneData = $(fieldOneEditor.getData()).html(); 

			if(fieldTwoEditor) {
				fieldTwoData = $(fieldTwoEditor.getData()).html();
			}

			var fieldThreeData = $(fieldThreeEditor.getData()).html(); 

			writeNewStickyToDb(fieldOneData, fieldTwoData, fieldThreeData);
		})

		deleteBtn.on('click', function() {
			// -- fade out the editor 
			$("#sticky-editor-row").fadeOut('slow');
				setTimeout(function() {
					$("#sticky-editor-row").remove();
					// -- redraw screen 
					showLoggedInSticky(currentTab);
				}, 2000)
			console.log("New Sticky Deleted");
			// -- notify user  
			var toastHTML = '<i class="material-icons">cancel</i>New Row Canceled!'
			M.toast({html: toastHTML, classes: 'rounded standard-toast'})
		})

	}

	function writeNewStickyToDb(f1, f2, f3) {
		db.collection('SiteContent').doc("Topics").collection(currentTab).doc("StickyNote").collection("Favorites").add({
				fieldone: f1, 
				fieldtwo: f2, 
				fieldthree: f3
		}).then(function(docRef) {
			console.log("Sticky written with ID: " + docRef.id);
			// -- notify user new sticky added 
			var toastHTML = '<i class="material-icons">border_color</i>New Row Added!'
			M.toast({html: toastHTML, classes: 'rounded standard-toast'})
			// -- redraw stickies 
			showLoggedInSticky(currentTab);
		})
	}

	function deleteStickyFromDb(stickyID) {
		//
		db.collection('SiteContent').doc("Topics").collection(currentTab).doc("StickyNote").collection("Favorites").doc(stickyID).delete().then(function() {
			console.log("Sticky " + stickyID + " deleted");
			// -- notify user sticky deleted 
			var toastHTML = '<i class="material-icons">delete_forever</i>Row Deleted'
			M.toast({html: toastHTML, classes: 'rounded standard-toast'})
		})
	}

// -- End 
})