package com.example.alex.myapplication.commands;

public class CommandManager {
    private static CommandManager commandManager;

    private CommandManager() {}

    public static CommandManager getInstance() {
        if(commandManager == null) {
            commandManager = new CommandManager();
            return commandManager;
        }
        else
            return commandManager;
    }

    public void execute(ICommand command) {
        command.execute();
    }
}