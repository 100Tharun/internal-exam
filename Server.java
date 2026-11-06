import java.rmi.Naming;
import java.rmi.registry.LocateRegistry;

public class Server {
public static void main(String[] args) throws Exception {

    // Start RMI registry on port 6000
    LocateRegistry.createRegistry(6000);

    // Create implementation object
    Impl obj = new Impl();

    // Bind the remote object
    Naming.rebind("rmi://localhost:6000/sonoo", obj);

    System.out.println("Server Started");
}


}