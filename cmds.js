const {models}= require('./model');
const Sequelize = require('sequelize');

const {log, biglog, errorlog, colorize}= require("./out");

exports.helpCmd = rl => {
	log('Comandos:');
	log(" h/help - Muestra la ayuda.");
	log(" list - Listar los quizzes existentes");
	log(" show <id> - Muestra la pregunta y la respuesta del quiz indicado");
	log(" add - Añadir un nuevo quiz existente");
	log(" delete <id> - Borrar el quiz indicado");
	log(" edit <id> - Editar el quiz indicado");
	log(" test <id> - Probar el quiz indicado");
	log(" p|play - Jugar a preguntas aleatorias de todos los quizzes");
	log(" credits - Créditos");
	log(" q|quiz - Salir del programa.");
	rl.prompt();
};

exports.listCmd = rl => {

	models.quiz.findAll()
	.each(quiz => {
		
			log(`[${colorize(quiz.id,'magenta')}]: ${quiz.question}`);
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(()=> {
		rl.prompt();
	});
};
const validateId = id => {
	return new Sequelize.Promise((resolve,reject) => {
		if (typeof id === "undefined") {
			reject(new Error(`Falta el parametro <id>. `));
		} else {
			id = parseInt(id);
			if (Number.isNaN(id)){
				reject(new Error(`El valor del parametro <id> no vale. `));
			}else{
				resolve(id);
			}

		}
	});
};


exports.showCmd = (rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if(!quiz){
			throw new Error(`No existe un quiz asociado al id= ${id}.`);
		}
		log(`[${colorize(quiz.id,'magenta')}]: ${quiz.question} ${colorize('=>','blue')} ${quiz.answer}`);
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};




exports.testCmd = (rl,id) => {
	  validateId(id)
	  .then(id => models.quiz.findById(id))
	  .then(quiz => {
	    if (!quiz){
	      throw new Error(` No existe un quiz asociado al id= ${id}.`)
	    }
	    return new Promise((resolve, reject) => {
	
	    makeQuestion(rl, quiz.question)
	    .then(answer => {
	      if(answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()){
	        log('La respuesta es correcta');
	        biglog('Correcta', 'green');
	        resolve()
	      }else{
	        log('La respuesta es incorrecta');
	        biglog('Incorrecta', 'red');
	        resolve()
	      }
	    })
	  })
	})
	  .catch(error => {
	    errorlog(error.message);
	  })
	  .then(() => {
	    rl.prompt();
	  });
	
};
	
	
	/*
	 *Empieza el juego
	 */
	exports.playCmd = rl => {
	
	  		let score = 0; 
	  		let restantes = []; 
	
	      for (i=0; i<models.quiz.count();i++){
	        toBeResolved[i]=i;

	      }
	
	  		const playOne = () => {
	        return new Promise ((resolve, reject) => {
	  				if(restantes.length === 0) {

	            log(' ¡No hay más preguntas!','blue');
	            log(' Fin del juego Aciertos: ');
	  					
	  					resolve();

	  					return;
	  				}

	  				let indice = Math.floor(Math.random()*restantes.length);
	  				let quiz = restantes[indice];
	  		    restantes.splice(indice, 1); 
	
	  		    makeQuestion(rl, quiz.question)
	  		    .then(answer => {
	            if(answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()){
	              score+=1;
	  				    log(` CORRECTO - Lleva ${score} aciertos`);
	  				    resolve(playOne());
	            }else{
	              		log('INCORRECTO', 'red');
	              log(` Fin del juego, Aciertos: ${score} `);
	  				   
	  				    resolve();
	  			    }
	  		    })
	  	     })
	  	  }
	  		models.quiz.findAll({raw: true}) 
	  		.then(quizzes => {
	  			restantes = quizzes;
	      })
	  		.then(() => {

	  		 	return playOne(); 
	  		 })
	  		.catch(e => {
	  			errorlog("Error:" + e);

	  		})
	  		.then(() => {

	  			biglog(score, 'green');
	  			rl.prompt();
	  		})
	};

const makeQuestion = (rl,text) => {

	return new Sequelize.Promise((resolve,reject)=> {
		rl.question(colorize(text,'red'),answer => {
			resolve(answer.trim());
		});
	});
};


exports.addCmd = rl => {
	makeQuestion(rl, 'Introduzca una pregunta: ')
	.then(q => {
		return makeQuestion(rl, 'Introduzca la respuesta: ')
		.then(a => {
			return {question: q, answer: a};
		});
	})
	.then(quiz => {
		return models.quiz.create(quiz);
	})
	.then(quiz => {
		log(`${colorize('Se ha añadido','magenta')}: ${question} ${colorize('=>','magenta')} ${answer}`);
	})
	.catch(Sequelize.ValidationError, error =>{
		errorlog('El quiz es erroneo');
		error.errors.forEach(({message})=> errorlog(message));
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(()=> {
		rl.prompt();
	});

};
exports.deleteCmd = (rl, id) => {
		validateId(id)
		.then(id => models.quiz.destroy({where: {id}}))
		.catch(error => {
			errorlog(error.message);
		})
		.then(() => {
			rl.prompt();
		});
};


exports.editCmd = (rl,id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if(!quiz){
			throw new Error(`Ǹo existe un quiz asociado al id=${id}.`);
		}

		process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
		return makeQuestion(rl, 'Introduzca la pregunta: ')
		.then( q => {
			process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
			return makeQuestion(rl, 'Introduzca la respuesta')
			.then(a => {
				quiz.question = q;
				quiz.answer= a;
				return quiz;
			});


		});

	})
	.then(quiz => {
		return quiz.save();
	})
	.then(quiz => {
		log(`Se ha cambiado el quiz ${colorize(id,'magenta')} por: ${question} ${colorize('=>','magenta')} ${answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog('El quiz es erroneo');
		error.errors.forEach(({message})=> errorlog(message)); // Me devuelve todos los errores de la matriz errors
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};





exports.quitCmd=rl => {
	rl.close();
	rl.prompt();

};


exports.creditsCmd = rl => {
	log("Autores de la practica: ");
    log("Daniel Lledó Raigal",'green');
   	log("Alfonso Cebollero Massia",'green');
   	rl.prompt();
};