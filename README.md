# eKyte Community Connector for Data Studio

# DEPRECATED - eKyte no more support Google Data Studio integrations

*This is not an official Google product*

This [Data Studio](https://datastudio.google.com) [Community
Connector](https://developers.google.com/datastudio/connector) lets users query
the [eKyte](https://www.ekyte.com/) API.

[Termos of use](https://www.ekyte.com/pt-br/termos-de-uso/)

[Privacy Policy](https://www.ekyte.com/pt-br/politica-de-privacidade-para-conector-data-studio/)

## Working with date/datetime fields

This Connector identify all date/datetime fields as TEXT, showing date or datetime values in the following format:
  - Date fields: 2022-08-09T00:00:00
  - DateTime fields: 2022-08-09T06:01:15.9186831
  
For a better experience we recommend create [computed fields](https://support.google.com/datastudio/answer/6299685#zippy=%2Cneste-artigo) for each date/datetime field and force a [convertion to DateTime](https://support.google.com/datastudio/answer/10309432?hl=pt-BR&ref_topic=7570421) using the following formula:

> PARSE_DATETIME("%Y-%m-%dT%H:%M:%E*S", field)

1. Creating a new computed field
![Creating a new computed field](https://github.com/eKyte/ekyte-googledatastudio-connector/blob/main/docs/create_new_field.png?raw=true)
2. Defining the formula for the new computed field referencing the original date/datetime field
![Defining the formula for the new computed field referencing the original date/datetime field](https://github.com/eKyte/ekyte-googledatastudio-connector/blob/main/docs/field_formula.png?raw=true)
3. New field created. Now its possible to use the original field (formated like a simple TEXT) or the computed filed (formated like a date/datetime field)
![New field created](https://github.com/eKyte/ekyte-googledatastudio-connector/blob/main/docs/computed_field_created.png?raw=true)
4. Showing the computed field value
![Showing the computed field value whith the right format](https://github.com/eKyte/ekyte-googledatastudio-connector/blob/main/docs/computed_field_value.png?raw=true)

  
## Deploy the Community Connector yourself

Use the [deployment guide](https://github.com/googledatastudio/community-connectors/blob/master/deploy.md) to deploy the Community Connector
yourself.
