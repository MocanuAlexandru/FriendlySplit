// Show/Hide submenu
window.addEventListener("load",()=>{
	let b=document.getElementById("dropdown-btn");
	b.addEventListener("click",()=>{
		let list=b.nextElementSibling;
		if(list.classList.contains("hidden"))
			{
				list.classList.remove("hidden");
			}
		else
			list.classList.add("hidden");
	});
});

//Date pentru tabele
window.addEventListener("load",()=>{
	Vue.prototype.axios = axios;
	let app=new Vue({
		el:'#app',
		data: {
			//table_fr: [{Name: 'Gigel'},{Name: 'Ionel'}, {Name: 'Fanel'}],
			table_fr: [],
			/*table_exp: [{
				Event: 'Taxi',
				Sum: 30,
				Payer: 1,
				Payee: [0,2]
			},
			{
				Event: 'Restaurant',
				Sum: 50,
				Payer: 2,
				Payee: [0,1,2]
			},
			{
				Event: 'Cinema',
				Sum: 36,
				Payer: 0,
				Payee: [0,2]
			}],*/
			table_exp: [],
			balance: [],
			aux_fr: {
				Name: null
			},
			aux_exp: {
				Event: null,
				Sum: null
			},
			editID_fr: null,
			editID_exp: null
		},
		created: function() {
			this.axios.get( '/api/splitwise_prieteni' )
        .then( (_response) => {
          let obj = _response.data.data;
					for(let idx in obj) {
						let new_obj = Object.assign({},obj[idx]);
						new_obj.Key = idx;
						this.table_fr.push(new_obj);
					}

				//select pentru platitor
					let platitor = document.getElementById('platitor');
					if(platitor !== null) {
						let option = document.createElement("option");
						platitor.appendChild(option);
						for(let idx = 0; idx < this.table_fr.length; ++idx) {
							let option = document.createElement("option");
							option.innerHTML= this.table_fr[idx].Name;
							platitor.appendChild(option);
						}
					}
					// select pentru beneficiari
						let beneficiari = document.getElementById("beneficiar");
						if(beneficiari !== null){
							for(let idx = 0; idx< this.table_fr.length ; ++idx)
											{
												let new_select = document.createElement("select");
												let option = document.createElement("option");
												new_select.appendChild(option);
												for (let j = 0; j<this.table_fr.length; ++j)
													{
														let new_option = document.createElement("option");
														new_option.innerHTML = this.table_fr[j].Name;
														new_select.appendChild(new_option);
													}
												beneficiari.appendChild(new_select);
											}
						}
        } );

			this.axios.get( '/api/splitwise_cheltuieli' )
	       .then( (_response) => {
	        let obj = _response.data.data;
					for(let idx in obj) {
						let new_obj = Object.assign({},obj[idx]);
						new_obj.Key = idx;
						this.table_exp.push(new_obj);
					}
	      } );
			setTimeout(()=>{
			/// calcul balanta
			let bal = [];
			for(let i=0; i<this.table_fr.length; ++i) bal[i]=0;
			for(let i=0; i<this.table_exp.length; ++i)
				{
					let platitor = this.table_exp[i].Payer;
					bal[platitor] += this.table_exp[i].Sum;
					for(let j=0;j<this.table_exp[i].Payee.length; ++j) {
						bal[this.table_exp[i].Payee[j]] -= this.table_exp[i].Sum / this.table_exp[i].Payee.length;
					}
				}
			let idx_platitor=0,idx_beneficiar=0,counter=0;
			while(idx_platitor+idx_beneficiar<bal.length*2) {
				while(idx_platitor<bal.length && bal[idx_platitor]>=0) idx_platitor++;
				if(idx_platitor>=bal.length) break;
				while(idx_beneficiar<bal.length && bal[idx_beneficiar]<=0) idx_beneficiar++;
				if(idx_beneficiar>=bal.length) break;
				let sum;
				if(bal[idx_platitor]+bal[idx_beneficiar]>0) sum = -bal[idx_platitor];
				else sum = bal[idx_beneficiar];
				bal[idx_platitor]+=sum;
				bal[idx_beneficiar]-=sum;
				let obj = {};
				obj.Sum = Math.round(100*sum)/100;
				obj.From = idx_platitor;
				obj.To = idx_beneficiar;
				if(obj.Sum!=0)this.balance.push(obj);
			}},100);
		},
		filters: {
      number: function( _in ) {
        return Number(_in).toFixed(2)
      }
    },
		methods: {
			commit_fr: function(){
				let obj={};
				obj.Name=this.aux_fr.Name;
				//add
				if(this.editID_fr==null)
				{
					axios.post( '/api/splitwise_prieteni' , obj )
            .then( _response => {
              if ( _response.data.ret === "OK" ) {
								obj.Key = _response.data.id;
								this.table_fr.push(obj);
              }
            } );
				}
				//edit
				else
				{
					axios.put( `/api/splitwise_prieteni/${this.table_fr[this.editID_fr].Key}` , obj );
					this.table_fr[this.editID_fr] = obj;
					this.editID_fr= null;
				}
				this.aux_fr = {
						Name: null
					};
			},
			remove_fr: function(idx){
				this.axios.delete( `/api/splitwise_prieteni/${this.table_fr[idx].Key}` )
          .then( () => {
						this.table_fr.splice(idx,1);
          } );
				let to_clean = [];
				for(let i = 0 ;i< this.table_exp.length; ++i) {
					let flag = false;
					if(this.table_exp[i].Payer == idx) flag = true;
					for(let j=0;j< this.table_exp[i].Payee.length; ++j) {
						if(this.table_exp[i].Payee[j] == idx) flag = true;
					}
					if(flag == true) {to_clean.push(i); continue;}
					else {
						if(this.table_exp[i].Payer > idx) this.table_exp[i].Payer--;
						for(let j=0;j< this.table_exp[i].Payee.length; ++j) {
								if(this.table_exp[i].Payee[j] > idx) this.table_exp[i].Payee[j]--;
							}
					}
				}
				for(let i = to_clean.length - 1; i>=0; --i)
					this.remove_exp(to_clean[i]);
			},
			edit_fr: function(idx){
				this.aux_fr.Name=this.table_fr[idx].Name;
				this.editID_fr=idx;
			},
			commit_exp: function(){
				//add
				let obj={};
				obj.Event=this.aux_exp.Event;
				obj.Sum=parseInt(this.aux_exp.Sum);
				let platitor = document.getElementById("platitor")
				let idx_platitor = platitor.selectedIndex - 1;
				if(idx_platitor < 0) {alert("Introduceti un platitor!");return;}
				obj.Payer=idx_platitor;
				let select_beneficiari = document.querySelectorAll("#beneficiar select");
				let fr = [];
				let flag = false;
				for (let i=0;i<this.table_fr.length;++i)
					fr[i]=0;
				for(let i=0;i<select_beneficiari.length;++i)
					{
						if(fr[select_beneficiari[i].selectedIndex-1]==1) flag = true;
						else fr[select_beneficiari[i].selectedIndex-1]++;
					}
				let answer = true;
				if(flag == true) {
					answer = confirm("Ati selectat de mai multe ori aceeasi persoana.\nDoriti sa eliminati duplicatele?");
				}
				obj.Payee = [];
				if(answer == true) {
					for (let i=0;i<this.table_fr.length;++i) {
						if(fr[i] != 0) obj.Payee.push(i);
					}
					if(this.editID_exp==null) {
						axios.post( '/api/splitwise_cheltuieli' , obj )
            .then( _response => {
              if ( _response.data.ret === "OK" ) {
                obj.Key = _response.data.id;
								this.table_exp.push(obj);
              }
            } );

					}
					else {
						axios.put( `/api/splitwise_cheltuieli/${this.table_exp[this.editID_exp].Key}` , obj );
					  this.table_exp[this.editID_exp] = obj;
						this.editID_exp= null;
					}
					platitor.selectedIndex = 0;
					for(let i=0;i<select_beneficiari.length;++i)
						select_beneficiari[i].selectedIndex = 0;
					this.aux_exp = {
							Event: null,
							Sum: null
						};
				}
			},
			remove_exp: function(idx){
				this.axios.delete( `/api/splitwise_cheltuieli/${this.table_exp[idx].Key}` )
          .then( () => {
            this.table_exp.splice(idx,1);
          } );

			},
			edit_exp: function(idx){
				this.aux_exp.Event = this.table_exp[idx].Event;
				this.aux_exp.Sum = this.table_exp[idx].Sum;
				let platitor = document.getElementById('platitor');
				platitor.selectedIndex = this.table_exp[idx].Payer + 1;
				let select_beneficiari = document.querySelectorAll("#beneficiar select");
				for(let i = 0; i<this.table_fr.length; ++i) select_beneficiari[i].selectedIndex = this.table_exp[idx].Payee[i] + 1;
				this.editID_exp=idx;
			},
			reset_table: function() {
				let rows = document.getElementsByTagName('tr');
				for(let i=0;i<rows.length;++i)
					rows[i].style.display="table-row";
			},
			search_table: function() {
				let select_persoana = document.getElementById("platitor");
				let persoana_cautata = select_persoana.selectedIndex-1;
				if(persoana_cautata<0) {
					alert("Nu ati ales nici un prieten!");
					return ;
				}
				select_persoana.selectedIndex = 0;
				this.reset_table();
				let rows = document.getElementsByTagName('tr');
				for(let i=0;i<this.balance.length;++i)
					{
						let flag=false;
						if(this.balance[i].To == persoana_cautata) flag=true;
						if(this.balance[i].From == persoana_cautata) flag=true;
						if(!flag) rows[i+1].style.display="none";
					}
			}
		}
	});
});
