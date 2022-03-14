var cc = DataStudioApp.createCommunityConnector();

function sendUserError(message) {
    cc.newUserError()
        .setText(message)
        .throwException();
}

function getAuthType() {
    return cc.newAuthTypeResponse()
        .setAuthType(cc.AuthType.NONE)
        .build();
}

function isAdminUser() {
    return true;
}

function getConfig(request) {

    var config = cc.getConfig();

    config
        .newInfo()
        .setId('instructions')
        .setText('Fill out the form to connect to a JSON data source.');

    config
        .newTextInput()
        .setId('key')
        .setName('Chave eKyte API')
        .setHelpText('Chave eKyte API')
        .setPlaceholder('Chave eKyte API');

    config
        .newTextInput()
        .setId('endpoint')
        .setName('URL/Endpoint API eKyte')
        .setHelpText('e.g. https://my-url.org/json')
        .setPlaceholder('https://my-url.org/json');

    config
        .newTextInput()
        .setId('queryString')
        .setName('Query string')
        .setHelpText('Filtro (query-string) utilizado para filtrar os dados (sem o parametro "page")')
        .setPlaceholder('Filtro (query-string)');

    config.setDateRangeRequired(false);

    return config.build();
}

function fetchDataFromApi(url) {
    try {
        var response = UrlFetchApp.fetch(url);
    } catch (e) {
        sendUserError('"' + url + '" returned an error:' + e);
    }

    try {
        var content = JSON.parse(response);
    } catch (e) {
        sendUserError('Invalid JSON format. ' + e);
    }

    if (!content) sendUserError('"' + url + '" returned no content.');

    return content;
}

function getSemanticType(value, types) {  
    if (!isNaN(value)) {
        return types.NUMBER;
    } else if (value === true || value === false) {
        return types.BOOLEAN;
    } else if (typeof value != 'object' && value != null) {
        if (
            value.match(
                new RegExp(
                    /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi
                )
            )
        ) {
            return types.URL;
        } else if (!isNaN(Date.parse(value))) {
            return types.YEAR_MONTH_DAY_HOUR;
        }
    }
    return types.TEXT;
}

function createField(fields, types, key, value) {
    var semanticType = getSemanticType(value, types);

    var field =
        semanticType == types.NUMBER ? fields.newMetric() : fields.newDimension();

    field.setType(semanticType);
    field.setId(key.replace(/\s/g, '_').toLowerCase());
    field.setDescription(key);
    field.setName(key);
}

function getElementKey(key, currentKey) {
    if (currentKey == '' || currentKey == null) {
        return;
    }
    if (key != null) {
        return key + '.' + currentKey.replace('.', '_');
    }
    return currentKey.replace('.', '_');
}

function createFields(fields, types, key, value) {
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        Object.keys(value).forEach(function (currentKey) {
            var elementKey = getElementKey(key, currentKey);
            if (value[currentKey] != null) {
                createField(fields, types, elementKey, value[currentKey]);
            } else {
                createField(fields, types, currentKey, value);
            }
        });
    } else if (key !== null) {
        createField(fields, types, key, value);
    }
}

function getFields(content) {
    var fields = cc.getFields();
    var types = cc.FieldType;
    
    if (!Array.isArray(content)) {
        content = [content];
    }
    
    if (typeof content[0] !== 'object' || content[0] === null) {
        sendUserError('Invalid JSON format');
    }
    try {
        createFields(fields, types, null, content[0]);
    } catch (e) {
        sendUserError('Unable to identify the data format of one of your fields.');
    }
    return fields;
}

function getSchema(request) {
    try {
        var content = fetchDataFromApi(getRequestUrl(request, 1));
        var fields = getFields(content.data);
    } catch (e) {
        sendUserError('Erro ao obter schema ' + e);
    }
    return { 'schema': fields.build() };
}

function getColumnValue(valuePaths, row) {
    for (var index in valuePaths) {
        var currentPath = valuePaths[index];

        if (row[currentPath] === null) {
            return '';
        }

        if (row[currentPath] !== undefined) {
            row = row[currentPath];
            continue;
        }
        var keys = Object.keys(row);

        for (var index_keys in keys) {
            var key = keys[index_keys].replace(/\s/g, '_').toLowerCase();
            if (key == currentPath) {
                row = row[keys[index_keys]];
                break;
            }
        }
    }
    return row;
}

function getColumns(content, requestedFields) {
    if (!Array.isArray(content)) content = [content];

    return content.map(function (row) {
        var rowValues = [];

        requestedFields.asArray().forEach(function (field) {
            var valuePaths = field.getId().split('.');
            var fieldValue = row === null ? '' : getColumnValue(valuePaths, row);

            rowValues.push(fieldValue);
        });
        return { values: rowValues };
    });
}

function getRequestUrl(request, page) {
    try {
        var filterQueryString = request.configParams.queryString.startsWith('&') ? request.configParams.queryString.substr(1) : request.configParams.queryString;
        var tokenQueryString = "apiKey=" + request.configParams.key;
        var pageQueryString = "page=" + page;
    } catch (e) {
        sendUserError('Erro ao montar a URL de consulta dos dados' + e);
    }
    return request.configParams.endpoint + "?" + tokenQueryString + "&" + pageQueryString + "&" + filterQueryString;
}

function getData(request) {
    try {
        var content = new Array();
        var hasNext = true;
        var page = 1;
        while (hasNext) {
            var currentPageContent = fetchDataFromApi(getRequestUrl(request, page));
            content = [...content, ...currentPageContent.data];
            page = currentPageContent.paging.currentPage.number + 1;
            hasNext = currentPageContent.paging.currentPage.number < currentPageContent.paging.totalPages;
            console.log("Lendo dados da página "+currentPageContent.paging.currentPage.number+ " de " + currentPageContent.paging.totalPages);
        }

        var fields = getFields(content[0]);
        var requestedFields = fields.forIds(
            request.fields.map(function(field) {
            return field.name;
            })
        );
    } catch (e) {
        sendUserError('Erro ao obter os dados' + e);
    }

    return {
        schema: requestedFields.build(),
        rows: getColumns(content, requestedFields)
    };
}
