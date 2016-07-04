var request = require("request");
var cheerio = require("cheerio");
var jsonfile = require('jsonfile')
 
var file = './tmp/data.json'
var obj = {};

var ligne_A_uri = "http://mobilite79.fr/synthese?SERVICE=page&p=17732927827738736&roid=11821953316815254",
    ligne_G_uri = "http://mobilite79.fr/synthese?SERVICE=page&p=17732927827738736&roid=11821953316815258",
    ligne_F_uri = "http://mobilite79.fr/synthese?SERVICE=page&p=17732927827738736&roid=11821953316815261",
    ligne_J_uri = "http://mobilite79.fr/synthese?SERVICE=page&p=17732927827738736&roid=11821953316815262";


var formOptions = []; // contient les options du formulaire
var formData = {
    'SERVICE' : '',
    'p' : '',
    'roid' : '',
    'cid' : ''
};


/**
 * ecriture de l'objet dans un fichier
 */
function writeJSONFile (){
    try{
        console.log('fin extraction periode : ' + formOptions[0].html());
        formOptions.shift();
        
        console.log('nb periode left ' + formOptions.length);
        if (formOptions.length === 0){
            jsonfile.writeFile(file, obj, function (err) {
                console.error(err)
            });
        } else {
            // recuperation de la periode suivante
            requestForm();
        }
    } catch(e){
        console.log(e.message);
    }
}


/**
 * extraction des horaires des 2 tableaux présents dans la page
 */
function extractHoraires ($){
    var result = {status : 'success', data : null };

    if ($(".timetable .r0").length > 0) {
        var _obj = {};
        // pour les 2 tables de la page (aller et retour) ...
        $(".timetable").each(function(i, el) {

            var trajet = {
                arrets : {},
                horaires : {}
            };

            // index des arrêts utiliser pour indexer les horaires
            var arretsIndex = 1;
            
            // recuperation du sens aller ou retour ...
            var sens = $(el).prev('h2').html().trim().toLowerCase().split(' ')[1];

            // pour chaque ligne du tableau
            $(el).find('.thmask .tt tr').each(function (i, el) {
                // class r = en-tête
                // class r0 et r1 les horaires
                if ($(el).hasClass('r0') || $(el).hasClass('r1')){
                    var ar = []; //tableau des horaires
                    var currentHoraire = '',
                        lastHoraire = ''; //permet de ne pas prendre les doublons

                    // le 2eme th contient le nom de l'arrêt
                    trajet.arrets[arretsIndex.toString()] = $(el).find('th:nth-child(2) a').html().trim();

                    // pour chaque cellule (donc horaire ...)
                    $(el).find('td').each(function (i, el){
                        currentHoraire = $(el).html().trim(); 
                        if (currentHoraire !== lastHoraire) {
                            ar.push(currentHoraire);
                            lastHoraire = currentHoraire;
                        }
                    }); 

                    // ajout des horaires à cet arrêt
                    trajet.horaires[arretsIndex.toString()] = ar;
                    
                    arretsIndex ++;
                }
            });

            _obj[sens] = trajet;
        });

        result.data = _obj;
    } else {
        console.log('aucun horaire sur cette periode');
        result.status = 'error';
    }

    return result;
}


/**
 * recuperation des données d'une autre periode
 */
function requestForm(){
    formData.cid = formOptions[0].val();
    // recuperation des horaires de l'autre période            
    request.post(
        {url:'http://mobilite79.fr/synthese', formData: formData}, 
        function optionalCallback(err, httpResponse, body) {
            if (err) {
                return console.error('upload failed:', err);
            }
            //console.log('Upload successful!  Server responded with:', body);
            var $ = cheerio.load(body);
            
            var result = extractHoraires($);
            if (result.status === 'success') {
                obj[formOptions[0].html()] = result.data;
            }

            writeJSONFile();
        }
    );
}

/**
 * parse de la page HTML
 */
function parseHTML (error, response, body){
    var $ = cheerio.load(body);

    // recherche du formulaire de selection des périodes
    var $formPeriode = $("form[name='period']");

    //formOptions = $formPeriode.find('option');
    $formPeriode.find('option').each(function (i, option){
        formOptions.push($(option));
    });

    // mise à jour de l'objet qui contient les données transmises avec le form
    formData.p = $formPeriode.find('input[name="p"]').val();
    formData.roid = $formPeriode.find('input[name="roid"]').val();
    formData.SERVICE = $formPeriode.find('input[name="SERVICE"]').val();

    console.log(formData);

    // on recupere les données de la période de la page
    var result = extractHoraires($);
    if (result.status === 'success') {
        obj[formOptions[0].html()] = result.data;
    }

    writeJSONFile();
}

/**
 * recuperation de la page HTML
 */
request({uri: ligne_J_uri}, parseHTML);
