import java.rmi.Remote;
import java.rmi.RemoteException;

public interface DivInterface extends Remote {
public int div(int x, int y) throws RemoteException;
}